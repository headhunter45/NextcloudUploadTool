use bytes::Bytes;
use futures_util::Stream;
use pin_project_lite::pin_project;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

/// Event fired during streaming file uploads to report transfer progress.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProgressEvent {
    /// Transfer has started. `total_bytes` is `None` if streaming from an unsized pipe / stdin.
    Started { total_bytes: Option<u64> },

    /// Transfer progress update with running count of transferred bytes.
    Progress {
        bytes_transferred: u64,
        total_bytes: Option<u64>,
    },

    /// Transfer has finished successfully.
    Completed { total_bytes: u64 },
}

/// A thread-safe callback invoked when transfer progress occurs.
pub type ProgressCallback = Arc<dyn Fn(ProgressEvent) + Send + Sync + 'static>;

pin_project! {
    /// A Stream wrapper that tracks transferred bytes and fires progress callbacks.
    pub struct ProgressStream<S> {
        #[pin]
        inner: S,
        total_bytes: Option<u64>,
        bytes_transferred: u64,
        callback: Option<ProgressCallback>,
        started: bool,
        completed: bool,
    }
}

impl<S> ProgressStream<S> {
    pub fn new(
        inner: S,
        total_bytes: Option<u64>,
        callback: Option<ProgressCallback>,
    ) -> Self {
        Self {
            inner,
            total_bytes,
            bytes_transferred: 0,
            callback,
            started: false,
            completed: false,
        }
    }
}

impl<S, E> Stream for ProgressStream<S>
where
    S: Stream<Item = std::result::Result<Bytes, E>>,
{
    type Item = std::result::Result<Bytes, E>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();

        if !*this.started {
            *this.started = true;
            if let Some(cb) = this.callback.as_ref() {
                cb(ProgressEvent::Started {
                    total_bytes: *this.total_bytes,
                });
            }
        }

        match this.inner.poll_next(cx) {
            Poll::Ready(Some(Ok(chunk))) => {
                *this.bytes_transferred += chunk.len() as u64;
                if let Some(cb) = this.callback.as_ref() {
                    cb(ProgressEvent::Progress {
                        bytes_transferred: *this.bytes_transferred,
                        total_bytes: *this.total_bytes,
                    });
                }
                Poll::Ready(Some(Ok(chunk)))
            }
            Poll::Ready(Some(Err(err))) => Poll::Ready(Some(Err(err))),
            Poll::Ready(None) => {
                if !*this.completed {
                    *this.completed = true;
                    if let Some(cb) = this.callback.as_ref() {
                        cb(ProgressEvent::Completed {
                            total_bytes: *this.bytes_transferred,
                        });
                    }
                }
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::stream;
    use futures_util::StreamExt;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Mutex;

    #[tokio::test]
    async fn test_progress_stream_events() {
        let chunk1 = Bytes::from_static(b"hello ");
        let chunk2 = Bytes::from_static(b"world!");
        let total_size = 12u64;

        let events = Arc::new(Mutex::new(Vec::new()));
        let last_bytes = Arc::new(AtomicU64::new(0));

        let events_clone = Arc::clone(&events);
        let last_bytes_clone = Arc::clone(&last_bytes);

        let callback = Arc::new(move |event: ProgressEvent| {
            if let ProgressEvent::Progress { bytes_transferred, .. } = event {
                last_bytes_clone.store(bytes_transferred, Ordering::SeqCst);
            }
            events_clone.lock().unwrap().push(event);
        });

        let raw_stream = stream::iter(vec![
            Ok::<Bytes, std::io::Error>(chunk1),
            Ok::<Bytes, std::io::Error>(chunk2),
        ]);

        let mut progress_stream = ProgressStream::new(raw_stream, Some(total_size), Some(callback));

        let mut collected = Vec::new();
        while let Some(item) = progress_stream.next().await {
            collected.extend_from_slice(&item.unwrap());
        }

        assert_eq!(&collected, b"hello world!");
        assert_eq!(last_bytes.load(Ordering::SeqCst), 12);

        let captured = events.lock().unwrap().clone();
        assert_eq!(captured.len(), 4); // Started, Progress(6), Progress(12), Completed(12)
        assert_eq!(captured[0], ProgressEvent::Started { total_bytes: Some(12) });
        assert_eq!(captured[1], ProgressEvent::Progress { bytes_transferred: 6, total_bytes: Some(12) });
        assert_eq!(captured[2], ProgressEvent::Progress { bytes_transferred: 12, total_bytes: Some(12) });
        assert_eq!(captured[3], ProgressEvent::Completed { total_bytes: 12 });
    }
}
