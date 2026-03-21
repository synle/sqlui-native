import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "src/frontend/components/DataTable";
import DateCell from "src/frontend/components/DateCell";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useDeleteDataSnapshot, useGetDataSnapshots } from "src/frontend/hooks/useDataSnapshot";

function IdCell({ row }: { row: any }) {
  const dataSnapshot = row.original;
  const linkToUse = `/data_snapshot/${dataSnapshot.id}`;
  return (
    <Link component={RouterLink} to={linkToUse}>
      {dataSnapshot.id}
    </Link>
  );
}

function DescriptionCell({ row, allExpanded }: { row: any; allExpanded: boolean }) {
  const dataSnapshot = row.original;
  const [localExpanded, setLocalExpanded] = useState<boolean | null>(null);
  const expanded = localExpanded ?? allExpanded;
  const description = dataSnapshot.description || "";

  if (!description) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
      <IconButton size="small" onClick={() => setLocalExpanded(!expanded)} sx={{ p: 0, minWidth: 0 }}>
        {expanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
      </IconButton>
      <Typography
        variant="body2"
        sx={{
          fontFamily: "monospace",
          fontSize: "0.8rem",
          whiteSpace: expanded ? "pre-wrap" : "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {expanded ? description : description.replace(/\s+/g, " ")}
      </Typography>
    </Box>
  );
}

function ActionCell({ row }: { row: any }) {
  const dataSnapshot = row.original;
  const { confirm } = useActionDialogs();
  const { mutateAsync: deleteRecord } = useDeleteDataSnapshot();

  const onDeleteRecycleBin = async (dataSnapshotId: string) => {
    try {
      await confirm(`Do you want to delete this item permanently "${dataSnapshotId}"?`);
      await deleteRecord(dataSnapshotId);
    } catch (err) {
      console.error("DataSnapshotListView.tsx:deleteRecord", err);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <IconButton aria-label="Delete item permanently" onClick={() => onDeleteRecycleBin(dataSnapshot.id)}>
        <DeleteForeverIcon />
      </IconButton>
    </Box>
  );
}

const getColumns = (allExpanded: boolean): ColumnDef<any, any>[] => [
  {
    header: "#",
    enableSorting: false,
    enableColumnFilter: false,
    size: 50,
    cell: (info) => <span style={{ fontFamily: "monospace", opacity: 0.5 }}>{info.row.index + 1}</span>,
  },
  {
    header: "ID",
    accessorKey: "id",
    cell: (info) => <IdCell row={info.row} />,
  },
  {
    header: "Location",
    accessorKey: "location",
  },
  {
    header: "Description",
    accessorKey: "description",
    cell: (info) => <DescriptionCell row={info.row} allExpanded={allExpanded} />,
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    size: 160,
    cell: (info) => <DateCell timestamp={info.row.original.createdAt} />,
  },
  {
    header: "",
    id: "action",
    size: 40,
    cell: (info) => <ActionCell row={info.row} />,
  },
];

/**
 * View listing all saved data snapshots in a table with links to view each snapshot and delete actions.
 */
export default function DataSnapshotListView() {
  const { data, isLoading } = useGetDataSnapshots();
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    window.document.title = `Data Snapshots`;
  }, []);

  if (isLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return <Alert severity="error">No data snapshot available</Alert>;
  }

  const columns = getColumns(allExpanded);

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Tooltip title={allExpanded ? "Collapse all descriptions" : "Expand all descriptions"}>
          <IconButton size="small" onClick={() => setAllExpanded(!allExpanded)}>
            {allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <DataTable data={data} columns={columns} />
    </>
  );
}
