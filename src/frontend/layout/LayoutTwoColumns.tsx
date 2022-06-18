import { Bar, Container, Section } from 'react-simple-resizer';
import { ReactElement, useEffect } from 'react';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';

type LayoutTwoColumnsProps = {
  className?: string;
  children: ReactElement[];
};

export default function LayoutTwoColumns(props: LayoutTwoColumnsProps) {
  const { className = '', children } = props;
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  return (
    <Container className='LayoutTwoColumns'>
      <Section defaultSize={width} onSizeChanged={onSetWidth} minSize={250} maxSize={600}>
        <div className='LayoutTwoColumns__LeftPane'>{children[0]}</div>
      </Section>
      <Bar size={10} className='Resizer Resizer--Horizontal' />
      <Section>
        <div className='LayoutTwoColumns__RightPane'>{children[1]}</div>
      </Section>
    </Container>
  );
}
