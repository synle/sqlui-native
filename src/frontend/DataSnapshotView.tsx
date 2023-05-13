import { downloadText } from 'src/frontend/data/file';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import InputLabel from '@mui/material/InputLabel';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useGetDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import DescriptionIcon from '@mui/icons-material/Description';
import DataArrayIcon from '@mui/icons-material/DataArray';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { downloadJSON, downloadCsv } from 'src/frontend/data/file';
import useToaster from 'src/frontend/hooks/useToaster';

type QuickActionDialProps = {
  data: any// TODO: fix me
}

function QuickActionDial(props: QuickActionDialProps){
  const{data} = props;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { modal } = useActionDialogs();
  const { add: addToast } = useToaster();

  const onOpen = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };


  const onGoToDataSnapshotList = async () => {
    navigate('/data_snapshot');
    onClose();
  };

  const onShowDescription = async () => {
    if (!data) {
      return;
    }

    try {
      await modal({
        title: 'Data Description',
        message: (
          <>
            <InputLabel>ID</InputLabel>
            <pre>{data.id}</pre>
            <InputLabel>Total</InputLabel>
            <pre>{data.values?.length || 0}</pre>
            <InputLabel>Created</InputLabel>
            <pre>{new Date(data.created).toLocaleString()}</pre>
            <InputLabel>Description</InputLabel>
            <pre>{data.description}</pre>
          </>
        ),
        showCloseButton: true,
        size: 'lg',
      });
    } finally {
    }
    onClose();
  };

  const onDownloadCSV = async () => {
    const fileName=`Snapshot ${new Date().toLocaleString()}.csv`

    downloadCsv(
      fileName,
      data.values
    );

    addToast({message:`"${fileName}" download has started`})
    onClose();
  }

  const onDownloadJSON = async () => {
    const fileName=`Snapshot ${new Date().toLocaleString()}.json`

    downloadJSON(
      fileName,
      data.values
    );

    addToast({message:`"${fileName}" download has started`})
    onClose();
  }

  return <SpeedDial
        ariaLabel="Actions"
        icon={<KeyboardArrowUpIcon />}
        onClose={onClose}
        onOpen={onOpen}
        open={open}
        sx={{position: 'fixed', bottom: 2, right: 2}}
      >
        <SpeedDialAction
          icon={<KeyboardArrowLeftIcon />}
          tooltipTitle="Go back to Data Snapshot List"
          onClick={onGoToDataSnapshotList}
        />
        <SpeedDialAction
          icon={<DescriptionIcon />}
          tooltipTitle="Show Data Snapshot Detailed Description"
          onClick={onShowDescription}
        />
        <SpeedDialAction
          icon={<ListAltIcon />}
          tooltipTitle="Download as CSV"
          onClick={onDownloadCSV}
        />
        <SpeedDialAction
          icon={<DataArrayIcon />}
          tooltipTitle="Download as JSON"
          onClick={onDownloadJSON}
        />
      </SpeedDial>
}

export default function DataSnapshotView() {
  const urlParams = useParams();
  const dataSnapshotId = urlParams.dataSnapshotId as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useGetDataSnapshot(dataSnapshotId);

  const onShowRecordDetails = async (rowData: any) => {
    try {
      await modal({
        title: 'Record Details',
        message: <SimpleEditor value={JSON.stringify(rowData, null, 2)} height='85vh' />,
        showCloseButton: true,
        size: 'lg',
      });
    } finally {
    }
  };

  const rowContextOptions = [
    {
      label: 'Show Details',
      onClick: onShowRecordDetails,
    },
  ];

  useEffect(() => {
    if (data) {
      window.document.title = `${new Date(data.created).toLocaleString()} Snapshot - ${
        data.description || ''
      }`.trim();
    } else {
      window.document.title = `Snapshot`.trim();
    }
  }, [data]);

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!data) {
    return <Alert severity='error'>No data for this snapshot</Alert>;
  }

  return (
    <>
      <Box
        className='DataSnapshotView'
        sx={{
          px: 1,
        }}>
        <DataTableWithJSONList
          onRowClick={onShowRecordDetails}
          rowContextOptions={rowContextOptions}
          data={data.values}
          searchInputId='result-box-search-input'
          enableColumnFilter={true}
          fullScreen={true}
        />
        <QuickActionDial data={data} />
      </Box>
    </>
  );
}
