import CodeEditorBox from 'src/frontend/components/CodeEditorBox';

type FormatDataProps = {
  data: unknown[] | unknown;
};

export default function JsonFormatData(props: FormatDataProps) : JSX.Element | null {
  const { data } = props;
  return <CodeEditorBox value={JSON.stringify(data, null, 2)} language='json' />;
}
