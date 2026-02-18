import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { useSnackbar } from "notistack";
import { getGeneratedRandomId } from "src/frontend/utils/commonUtils";

const QUERY_KEY_TOASTS = "toasts";

type CoreToasterProps = {
  message: string | JSX.Element;
  autoHideDuration?: number;
  action?: JSX.Element;
};

type ToasterProps = CoreToasterProps & {
  id?: string;
};

export type ToasterHandler = {
  dismiss: (dismissDelay?: number) => void;
};

const DEFAULT_AUTO_HIDE_DURATION = 6000;

export default function useToaster() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const add = (props: ToasterProps): Promise<ToasterHandler> => {
    return new Promise((resolve, reject) => {
      const toastId = props.id || getGeneratedRandomId(`toasterId`);

      enqueueSnackbar(props.message, {
        ...props,
        id: toastId,
        key: toastId,
        autoHideDuration: props.autoHideDuration || DEFAULT_AUTO_HIDE_DURATION,
        action: (snackbarKey) => (
          <>
            {props.action}
            <IconButton onClick={() => closeSnackbar(snackbarKey)} size="small" aria-label="close" color="inherit">
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ),
        anchorOrigin: { horizontal: "center", vertical: "bottom" },
      });

      resolve({
        dismiss: (dismissDelay?: number) => {
          dismiss(toastId, dismissDelay);
        },
      });
    });
  };

  const dismiss = (toastId: string, dismissDelay?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        closeSnackbar(toastId);
        resolve();
      }, dismissDelay || 0);
    });
  };

  return {
    add,
    dismiss,
  };
}
