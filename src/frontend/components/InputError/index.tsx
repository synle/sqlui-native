type InputErrorProps = {
  message: string;
  sx: any;
};

export default function InputError(props: InputErrorProps): JSX.Element | null {
  const _setCustomError = (e) => {
    e.target.setCustomValidity(props.message);
  };

  return (
    <input
      type='text'
      required
      value=''
      onChange={() => {}}
      onInvalid={_setCustomError}
      style={{
        height: 0,
        width: 0,
        padding: 0,
        margin: 0,
        position: 'absolute',
        borderColor: 'transparent',
        background: 'transparent',
        outline: 'none',
        transform: 'scale(0.2)',
      }}
    />
  );
}
