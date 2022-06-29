import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import React from 'react';
import { useGetCurrentSession } from 'src/frontend/hooks/useSession';

export type BreadcrumbLink = {
  label: string | React.ReactElement;
  href?: string;
};

type BreadcrumbProps = {
  links: BreadcrumbLink[];
};

export default (props: BreadcrumbProps) => {
  const { links } = props;
  const { data: currentSession, isLoading } = useGetCurrentSession();

  if (isLoading) {
    return null;
  }

  if (!currentSession) {
    return null;
  }

  links.unshift({
    label: (
      <>
        <HomeIcon fontSize='inherit' />
        {currentSession.name}
      </>
    ),
    href: '/',
  });

  return (
    <Box role='presentation' sx={{ my: 2, userSelect: 'none' }}>
      <Breadcrumbs aria-label='breadcrumb' separator={<NavigateNextIcon fontSize='small' />}>
        {links.map((link, idx) => {
          if (!link.href || (links.length > 1 && idx === links.length - 1)) {
            return (
              <Typography
                key={idx}
                sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                variant='h6'>
                {link.label}
              </Typography>
            );
          }

          return (
            <Link
              key={idx}
              underline='hover'
              component={RouterLink}
              to={link.href}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography sx={{ display: 'flex', gap: 1, alignItems: 'center' }} variant='h6'>
                {link.label}
              </Typography>
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
