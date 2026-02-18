import DataArrayIcon from "@mui/icons-material/DataArray";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import InputLabel from "@mui/material/InputLabel";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import SimpleEditor from "src/frontend/components/CodeEditorBox/SimpleEditor";
import { DataTableWithJSONList } from "src/frontend/components/DataTable";
import { downloadCsv, downloadJSON } from "src/frontend/data/file";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useGetDataSnapshot } from "src/frontend/hooks/useDataSnapshot";
import useToaster from "src/frontend/hooks/useToaster";

type QuickActionDialProps = {
  data: any; // TODO: fix me
};

function QuickActionDial(props: QuickActionDialProps) {
  const { data } = props;
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
    navigate("/data_snapshot");
    onClose();
  };

  const onShowDescription = async () => {
    if (!data) {
      return;
    }

    try {
      await modal({
        title: "Data Description",
        message: (
          <>
            <InputLabel>ID</InputLabel>
            <pre>{data.id}</pre>
            <InputLabel>Location</InputLabel>
            <pre>{data.location}</pre>
            <InputLabel>Total</InputLabel>
            <pre>{data.values?.length || 0}</pre>
            <InputLabel>Created</InputLabel>
            <pre>{new Date(data.created).toLocaleString()}</pre>
            <InputLabel>Description</InputLabel>
            <pre>{data.description}</pre>
          </>
        ),
        showCloseButton: true,
        size: "lg",
      });
    } finally {
    }
    onClose();
  };

  const onDownloadCSV = async () => {
    const fileName = `Snapshot ${new Date().toLocaleString()}.csv`;

    downloadCsv(fileName, data.values);

    addToast({ message: `"${fileName}" download has started` });
    onClose();
  };

  const onDownloadJSON = async () => {
    const fileName = `Snapshot ${new Date().toLocaleString()}.json`;

    downloadJSON(fileName, data.values);

    addToast({ message: `"${fileName}" download has started` });
    onClose();
  };

  const actionDoms = !data
    ? null
    : [
        <SpeedDialAction
          key="action_data_snapshot_detailed_description"
          icon={<DescriptionIcon />}
          tooltipTitle="Show Data Snapshot Detailed Description"
          onClick={onShowDescription}
        />,
        <SpeedDialAction key="action_download_as_csv" icon={<ListAltIcon />} tooltipTitle="Download as CSV" onClick={onDownloadCSV} />,
        <SpeedDialAction key="action_download_as_json" icon={<DataArrayIcon />} tooltipTitle="Download as JSON" onClick={onDownloadJSON} />,
      ];
  return (
    <SpeedDial
      ariaLabel="Actions"
      icon={<KeyboardArrowUpIcon />}
      onClose={onClose}
      onOpen={onOpen}
      open={open}
      sx={{ position: "fixed", bottom: 2, right: 2 }}
    >
      <SpeedDialAction icon={<KeyboardArrowLeftIcon />} tooltipTitle="Go back to Data Snapshot List" onClick={onGoToDataSnapshotList} />
      {actionDoms}
    </SpeedDial>
  );
}

export default function DataSnapshotView() {
  const urlParams = useParams();
  const dataSnapshotId = urlParams.dataSnapshotId as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useGetDataSnapshot(dataSnapshotId);

  const onShowRecordDetails = async (rowData: any) => {
    try {
      await modal({
        title: "Record Details",
        message: <SimpleEditor value={JSON.stringify(rowData, null, 2)} height="85vh" />,
        showCloseButton: true,
        size: "lg",
      });
    } finally {
    }
  };

  const rowContextOptions = [
    {
      label: "Show Details",
      onClick: onShowRecordDetails,
    },
  ];

  useEffect(() => {
    if (data) {
      window.document.title = `${new Date(data.created).toLocaleString()} Snapshot - ${data.description || ""}`.trim();
    } else {
      window.document.title = `Snapshot`.trim();
    }
  }, [data]);

  if (isLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  let content = <></>;
  if (!data) {
    content = <Alert severity="error">No data for this snapshot</Alert>;
  } else {
    content = (
      <DataTableWithJSONList
        onRowClick={onShowRecordDetails}
        rowContextOptions={rowContextOptions}
        data={data.values}
        searchInputId="result-box-search-input"
        enableColumnFilter={true}
        fullScreen={true}
      />
    );
  }

  return (
    <>
      <Box
        className="DataSnapshotView"
        sx={{
          px: 1,
        }}
      >
        {content}
        <QuickActionDial data={data} />
      </Box>
    </>
  );
}
