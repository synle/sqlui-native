import { Button } from "@mui/material";
import { useTestConnection } from "src/frontend/hooks/useConnection";
import useToaster from "src/frontend/hooks/useToaster";
import { SqluiCore } from "typings";

/** Props for the TestConnectionButton component. */
type TestConnectionButtonProps = {
  /** Connection properties to test against. */
  connection: SqluiCore.CoreConnectionProps;
};

/**
 * Button that tests a database connection and displays the result via toast notification.
 * @param props - Contains the connection properties to test.
 * @returns The test connection button.
 */
export default function TestConnectionButton(props: TestConnectionButtonProps): JSX.Element | null {
  const { mutateAsync: testConnection } = useTestConnection();
  const { add: addToast, dismiss: dismissToast } = useToaster();
  const toastId = `toast.connectionCheck.${props.connection.connection}`;

  const onTestConnection = async () => {
    let message = "";

    await addToast({
      id: toastId,
      message: "Checking connection...",
    });

    if (!props.connection.connection) {
      message = `Connection is required to perform testing.`;
    } else {
      try {
        await testConnection(props.connection);
        message = `Successfully connected to Server.`;
      } catch (err) {
        message = `Failed to connect to Server. ${JSON.stringify(err)}.`;
      }
    }

    if (message) {
      await dismissToast(toastId);
      await addToast({
        id: toastId,
        message,
      });
    }
  };

  return (
    <>
      <Button type="button" onClick={() => onTestConnection()}>
        Test Connection
      </Button>
    </>
  );
}
