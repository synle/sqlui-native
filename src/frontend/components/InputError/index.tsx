/** Props for the InputError component. */
type InputErrorProps = {
  /** The custom validation error message to display. */
  message: string;
  /** Style overrides (unused, reserved for future use). */
  sx: any;
};

/**
 * A hidden required input that triggers a custom HTML5 validation error message.
 * Used to display form-level error messages via the browser's built-in validation UI.
 * @param props - Contains the error message to display on validation.
 * @returns A visually hidden input element.
 */
export default function InputError(props: InputErrorProps): JSX.Element | null {
  const _setCustomError = (e) => {
    e.target.setCustomValidity(props.message);
  };

  return (
    <input
      type="text"
      required
      value=""
      onChange={() => {}}
      onInvalid={_setCustomError}
      style={{
        height: 0,
        width: 0,
        padding: 0,
        margin: 0,
        position: "absolute",
        borderColor: "transparent",
        background: "transparent",
        outline: "none",
        transform: "scale(0.2)",
      }}
    />
  );
}
