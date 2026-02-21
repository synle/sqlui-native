import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { getGeneratedRandomId } from "src/frontend/utils/commonUtils";

type CoreToasterProps = {
  message: string | JSX.Element;
  autoHideDuration?: number;
  action?: JSX.Element;
};

type ToasterProps = CoreToasterProps & {
  id?: string;
  /** Additional detail text (shown in expanded view) */
  detail?: string;
  /** Additional metadata object (shown in expanded view) */
  metadata?: Record<string, any>;
};

export type ToasterHandler = {
  dismiss: (dismissDelay?: number) => void;
};

export type ToastHistoryEntry = {
  id: string;
  message: string | JSX.Element;
  detail?: string;
  metadata?: Record<string, any>;
  createdTime: number;
  dismissTime?: number;
  dismissTriggered?: "user" | "auto";
};

function _stringifyMetadata(metadata: any): string | undefined {
  if (metadata === null || metadata === undefined) return undefined;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

const DEFAULT_AUTO_HIDE_DURATION = 5000;

type InternalToast = {
  id: string;
  message: string | JSX.Element;
  action?: JSX.Element;
  autoHideDuration?: number;
  detail?: string;
  metadata?: Record<string, any>;
  createdTime: number;
};

// Module-level state
let _activeToasts: InternalToast[] = [];
let _toastHistory: ToastHistoryEntry[] = [];
let _listeners: Array<() => void> = [];

function _notify() {
  for (const listener of _listeners) {
    listener();
  }
}

function _addToast(props: ToasterProps): string {
  const toastId = props.id || getGeneratedRandomId("toasterId");
  const now = Date.now();

  // Check if a toast with same id already exists - update it instead of remove/re-add
  const existingIndex = _activeToasts.findIndex((t) => t.id === toastId);
  if (existingIndex !== -1) {
    _activeToasts[existingIndex] = {
      ..._activeToasts[existingIndex],
      message: props.message,
      action: props.action,
      autoHideDuration: props.autoHideDuration,
      detail: props.detail,
      metadata: props.metadata,
    };
    // Also update the history entry's detail and metadata
    const historyEntry = _toastHistory.find((h) => h.id === toastId && !h.dismissTime);
    if (historyEntry) {
      historyEntry.message = props.message;
      historyEntry.detail = props.detail;
      historyEntry.metadata = props.metadata;
    }
    _activeToasts = [..._activeToasts];
  } else {
    const toast: InternalToast = {
      id: toastId,
      message: props.message,
      action: props.action,
      autoHideDuration: props.autoHideDuration,
      detail: props.detail,
      metadata: props.metadata,
      createdTime: now,
    };
    _activeToasts = [..._activeToasts, toast];
    _toastHistory = [
      ..._toastHistory,
      {
        id: toastId,
        message: props.message,
        detail: props.detail,
        metadata: props.metadata,
        createdTime: now,
      },
    ];
  }

  _notify();
  return toastId;
}

function _dismissToast(toastId: string, trigger: "user" | "auto") {
  const existed = _activeToasts.some((t) => t.id === toastId);
  if (!existed) return;

  _activeToasts = _activeToasts.filter((t) => t.id !== toastId);

  // Update history
  const historyEntry = _toastHistory.find((h) => h.id === toastId && !h.dismissTime);
  if (historyEntry) {
    historyEntry.dismissTime = Date.now();
    historyEntry.dismissTriggered = trigger;
  }

  _notify();
}

export function getToastHistory(): ToastHistoryEntry[] {
  return _toastHistory;
}

function formatTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

// Detail / metadata modal for a single toast
function ToastDetailModal({ toast, open, onClose }: { toast: InternalToast; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Notification Detail
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div style={{ fontSize: "0.85rem" }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ opacity: 0.6, fontSize: "0.75rem", marginBottom: "2px" }}>Message</div>
            <div>{toast.message}</div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ opacity: 0.6, fontSize: "0.75rem", marginBottom: "2px" }}>ID</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{toast.id}</div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ opacity: 0.6, fontSize: "0.75rem", marginBottom: "2px" }}>Created</div>
            <div>{formatTime(toast.createdTime)}</div>
          </div>
          {toast.detail && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ opacity: 0.6, fontSize: "0.75rem", marginBottom: "2px" }}>Detail</div>
              <pre
                style={{
                  margin: 0,
                  padding: "4px 8px",
                  background: "rgba(128,128,128,0.15)",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {toast.detail}
              </pre>
            </div>
          )}
          {toast.metadata && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ opacity: 0.6, fontSize: "0.75rem", marginBottom: "2px" }}>Metadata</div>
              <pre
                style={{
                  margin: 0,
                  padding: "4px 8px",
                  background: "rgba(128,128,128,0.15)",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {_stringifyMetadata(toast.metadata)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Toast item component
function ToastItem({ toast, onExpand }: { toast: InternalToast; onExpand: (toast: InternalToast) => void }) {
  const isHoveredRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = React.useCallback(() => {
    if (toast.autoHideDuration != null && toast.autoHideDuration <= 0) return;
    const duration = toast.autoHideDuration || DEFAULT_AUTO_HIDE_DURATION;
    timerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) {
        _dismissToast(toast.id, "auto");
      }
    }, duration);
  }, [toast.id, toast.autoHideDuration]);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Only start auto-dismiss if autoHideDuration is undefined (use default) or > 0
    if (toast.autoHideDuration === undefined || toast.autoHideDuration > 0) {
      startTimer();
    }
    return clearTimer;
  }, [toast.autoHideDuration, startTimer, clearTimer]);

  const onMouseEnter = () => {
    isHoveredRef.current = true;
    clearTimer();
  };

  const onMouseLeave = () => {
    isHoveredRef.current = false;
    if (toast.autoHideDuration === undefined || toast.autoHideDuration > 0) {
      startTimer();
    }
  };

  const handleExpand = () => {
    onExpand(toast);
    _dismissToast(toast.id, "user");
  };

  return (
    <div
      className="Toaster__Item"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 16px",
        background: "#323232",
        color: "#fff",
        borderRadius: "4px",
        boxShadow: "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
        fontSize: "0.875rem",
        minWidth: "280px",
        maxWidth: "500px",
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action}
      <IconButton onClick={handleExpand} size="small" aria-label="expand" color="inherit">
        <OpenInFullIcon sx={{ fontSize: "0.875rem" }} />
      </IconButton>
      <IconButton onClick={() => _dismissToast(toast.id, "user")} size="small" aria-label="close" color="inherit">
        <CloseIcon fontSize="small" />
      </IconButton>
    </div>
  );
}

// Container component rendered via portal
function ToasterContainer() {
  const [toasts, setToasts] = useState<InternalToast[]>(_activeToasts);
  const [expandedToast, setExpandedToast] = useState<InternalToast | null>(null);

  useEffect(() => {
    const listener = () => setToasts([..._activeToasts]);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  return ReactDOM.createPortal(
    <>
      {toasts.length > 0 && (
        <div
          className="Toaster__Container"
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column-reverse",
            gap: "8px",
            pointerEvents: "auto",
          }}
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onExpand={setExpandedToast} />
          ))}
        </div>
      )}
      {expandedToast && (
        <ToastDetailModal toast={expandedToast} open={true} onClose={() => setExpandedToast(null)} />
      )}
    </>,
    document.body,
  );
}

// Mount the container once
let _containerMounted = false;
function _ensureContainerMounted() {
  if (_containerMounted) return;
  _containerMounted = true;

  const container = document.createElement("div");
  container.id = "toaster-root";
  document.body.appendChild(container);
  ReactDOM.render(<ToasterContainer />, container);
}

export default function useToaster() {
  useEffect(() => {
    _ensureContainerMounted();
  }, []);

  const add = (props: ToasterProps): Promise<ToasterHandler> => {
    return new Promise((resolve) => {
      const toastId = _addToast(props);

      resolve({
        dismiss: (dismissDelay?: number) => {
          dismiss(toastId, dismissDelay);
        },
      });
    });
  };

  const dismiss = (toastId: string, dismissDelay?: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        _dismissToast(toastId, "user");
        resolve();
      }, dismissDelay || 0);
    });
  };

  return {
    add,
    dismiss,
  };
}
