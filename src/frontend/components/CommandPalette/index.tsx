import React from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import fuzzysort from "fuzzysort";
import { useEffect, useRef, useState } from "react";
import { Command as CoreCommand } from "src/frontend/components/MissionControl";
import { useGetConnectionById, useGetConnections } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery, useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import { SqluiEnums } from "typings";

/** A command with a required display label, extending the base MissionControl Command. */
type Command = CoreCommand & {
  label: string;
};

/** Props for the CommandPalette component. */
type CommandPaletteProps = {
  /** Callback invoked when the user selects a command. */
  onSelectCommand: (command: Command) => void;
};

/** Defines a single command palette option with its event, label, and expansion behavior. */
type CommandOption = {
  event: SqluiEnums.ClientEventKey;
  label: string;
  /**
   * This means that the queries will need to be expanded before showing the command options
   */
  expandQueries?: boolean;
  /**
   * whether or not to attach current query to this command
   */
  useCurrentQuery?: boolean;
  /**
   * This means that the connections will need to be expanded before showing the command options
   */
  expandConnections?: boolean;
  /**
   * whether or not to attach current connection
   */
  useCurrentConnection?: boolean;
  data?: any;
};

/** All available command palette options for navigation, settings, sessions, connections, and queries. */
const ALL_COMMAND_PALETTE_OPTIONS: CommandOption[] = [
  { event: "clientEvent/navigate", label: "Open Main Query Page", data: "/" },
  {
    event: "clientEvent/navigate",
    label: "Open Data Migration",
    data: "/migration",
  },
  {
    event: "clientEvent/navigate",
    label: "Open Recycle Bin Page",
    data: "/recycle_bin",
  },
  {
    event: "clientEvent/navigate",
    label: "Open Query History",
    data: "/query_history",
  },
  {
    event: "clientEvent/openAppWindow",
    label: "Open Data Snapshots",
    data: "/data_snapshot",
  },
  {
    event: "clientEvent/navigate",
    label: "Open Bookmarks Page",
    data: "/bookmarks",
  },
  { event: "clientEvent/showSettings", label: "Settings" },
  { event: "clientEvent/import", label: "Import" },
  { event: "clientEvent/exportAll", label: "Export All" },
  {
    event: "clientEvent/changeDarkMode",
    label: "Enable Dark Mode",
    data: "dark",
  },
  {
    event: "clientEvent/tableRenderer",
    label: "Use advanced table renderer",
    data: "advanced",
  },
  {
    event: "clientEvent/tableRenderer",
    label: "Use simple table renderer",
    data: "simple",
  },
  {
    event: "clientEvent/changeDarkMode",
    label: "Disable Dark Mode (Use Light Mode)",
    data: "light",
  },
  {
    event: "clientEvent/changeEditorMode",
    label: "Use advanced editor mode",
    data: "advanced",
  },
  {
    event: "clientEvent/changeEditorMode",
    label: "Use simple editor mode",
    data: "simple",
  },
  {
    event: "clientEvent/changeEditorHeight/small",
    label: "Use small editor height",
  },
  {
    event: "clientEvent/changeEditorHeight/medium",
    label: "Use medium editor height",
  },
  {
    event: "clientEvent/changeEditorHeight/full",
    label: "Use full editor height",
  },
  {
    event: "clientEvent/changeAnimationMode/system",
    label: "Use system's animation setting",
  },
  {
    event: "clientEvent/changeAnimationMode/off",
    label: "Prefer animation off",
  },
  {
    event: "clientEvent/changeAnimationMode/on",
    label: "Prefer animation on",
  },
  {
    event: "clientEvent/changeLayoutMode/comfortable",
    label: "Use comfortable layout",
  },
  {
    event: "clientEvent/changeLayoutMode/compact",
    label: "Use compact layout",
  },
  {
    event: "clientEvent/changeWrapMode",
    label: "Enable word wrap",
    data: "wrap",
  },
  {
    event: "clientEvent/changeWrapMode",
    label: "Disable word wrap",
    data: "",
  },
  {
    event: "clientEvent/changeQueryTabOrientation",
    label: "Use Horizontal Tab Orientation",
    data: "horizontal",
  },
  {
    event: "clientEvent/changeQueryTabOrientation",
    label: "Use Vertical Tab Orientation",
    data: "vertical",
  },
  {
    event: "clientEvent/showQueryHelp",
    label: "Show Query Help",
  },
  { event: "clientEvent/clearShowHides", label: "Collapse All Connections" },
  {
    event: "clientEvent/changeDarkMode",
    label: "Follows System Settings for Dark Mode",
    data: "",
  },

  {
    event: "clientEvent/changeQuerySelectionMode",
    label: "Open queries in the same tab",
    data: "same-tab",
  },

  {
    event: "clientEvent/changeQuerySelectionMode",
    label: "Open queries in a new tab",
    data: "new-tab",
  },

  // sessions
  { event: "clientEvent/session/switch", label: "Switch Session" },
  { event: "clientEvent/session/new", label: "New Session" },
  { event: "clientEvent/session/rename", label: "Rename Current Session" },
  { event: "clientEvent/session/delete", label: "Delete Current Session" },
  { event: "clientEvent/session/clone", label: "Clone Current Session" },

  // connections
  { event: "clientEvent/connection/new", label: "New Connection" },
  {
    event: "clientEvent/connection/delete",
    label: "Delete Connection",
    expandConnections: true,
  },
  {
    event: "clientEvent/connection/delete",
    label: "Delete Current Connection",
    useCurrentConnection: true,
  },
  {
    event: "clientEvent/connection/refresh",
    label: "Refresh Current Connection",
    useCurrentConnection: true,
  },

  // queries
  { event: "clientEvent/query/new", label: "New Query" },
  { event: "clientEvent/query/show", label: "Show Query", expandQueries: true },
  {
    event: "clientEvent/query/rename",
    label: "Rename Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/export",
    label: "Export Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/duplicate",
    label: "Duplicate Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/close",
    label: "Close Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/closeOther",
    label: "Close Other Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/reveal",
    label: "Reveal Query Connection",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/pin",
    label: "Pin Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/unpin",
    label: "Unpin Current Query",
    useCurrentQuery: true,
  },
  {
    event: "clientEvent/query/closeToTheRight",
    label: "Close Tabs to The Right Of Current Query",
    useCurrentQuery: true,
  },
  { event: "clientEvent/toggleSidebar", label: "Toggle Sidebar" },
  { event: "clientEvent/schema/search", label: "Search Schema" },
  { event: "clientEvent/checkForUpdate", label: "Check For Update" },
  { event: "clientEvent/toggleDevtools", label: "Toggle React Query Devtools" },
];

/**
 * Searchable command palette for quickly executing application commands via fuzzy text matching.
 * Supports keyboard navigation (arrow keys, Enter) through the filtered command list.
 * @param props - Configuration including the command selection callback.
 * @returns The rendered command palette with search input and command list.
 */
export default function CommandPalette(props: CommandPaletteProps): React.JSX.Element | null {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Command[]>([]);
  const [, setAllOptions] = useState<Command[]>([]);
  const refOption = useRef<HTMLDivElement>(null);
  const { query: activeQuery } = useActiveConnectionQuery();
  const { queries } = useConnectionQueries();
  const { data: activeConnection } = useGetConnectionById(activeQuery?.connectionId);
  const { data: connections } = useGetConnections();

  useEffect(() => {
    const newAllOptions: Command[] = [];
    ALL_COMMAND_PALETTE_OPTIONS.forEach((commandOption) => {
      if (commandOption.expandQueries === true) {
        if (queries && queries?.length > 0) {
          for (const query of queries) {
            newAllOptions.push({
              event: commandOption.event,
              label: `${commandOption.label} > ${query.name}`,
              data: query,
            });
          }
        }
      } else if (commandOption.useCurrentQuery === true) {
        if (activeQuery) {
          newAllOptions.push({
            ...commandOption,
            data: activeQuery,
          });
        }
      } else if (commandOption.expandConnections === true) {
        if (connections && connections.length > 0) {
          for (const connection of connections) {
            newAllOptions.push({
              event: commandOption.event,
              label: `${commandOption.label} > ${connection.name}`,
              data: connection,
            });
          }
        }
      } else if (commandOption.useCurrentConnection === true) {
        if (activeConnection) {
          newAllOptions.push({
            ...commandOption,
            data: activeConnection,
          });
        }
      } else {
        newAllOptions.push(commandOption);
      }
    });

    setAllOptions(newAllOptions);

    // filter out the options
    let newOptions: Command[] = newAllOptions;

    if (text) {
      newOptions = fuzzysort.go(text, newOptions, { key: "label" }).map((result) => result.obj);
    }

    setOptions(newOptions);
  }, [queries, activeQuery, text]);

  const onSelectCommand = (command: Command) => {
    props.onSelectCommand(command);
  };

  const onTextboxKeyDown = (e: React.KeyboardEvent) => {
    if (!refOption || !refOption.current) {
      return;
    }

    let moveDirection: number | undefined;

    switch (e.key) {
      case "Enter":
        if ((e.target as HTMLInputElement).type === "text") {
          moveDirection = -1;
        }
        break;
      case "ArrowDown":
        moveDirection = 1;
        break;
      case "ArrowUp":
        moveDirection = -1;
        break;
    }

    if (moveDirection !== undefined) {
      e.preventDefault();

      const allOptions = [...refOption?.current?.querySelectorAll(".CommandPalette__Option")];

      const selectedElem = refOption?.current?.querySelector(".CommandPalette__Option:focus");
      let nextIndex = selectedElem ? allOptions.indexOf(selectedElem) + moveDirection : 0;

      if (nextIndex < 0) {
        nextIndex = 0;
      }

      if (nextIndex >= allOptions.length) {
        nextIndex = allOptions.length - 1;
      }

      (refOption?.current?.querySelectorAll(".CommandPalette__Option")[nextIndex] as HTMLButtonElement)?.focus();
    }
  };

  const optionsToShow = options.sort((a, b) => (a.label || "").localeCompare(b.label || ""));

  return (
    <section ref={refOption} onKeyDown={(e) => onTextboxKeyDown(e)}>
      <div>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="> Type a command here"
          fullWidth
          size="small"
          autoComplete="off"
        />
      </div>
      <List dense sx={{ mt: 1 }}>
        {optionsToShow.map((option, idx) => (
          <ListItemButton
            className="CommandPalette__Option"
            key={`${option.event}.${idx}`}
            onClick={() => onSelectCommand(option)}
            title={option.event}
          >
            <ListItemText primary={option.label} />
          </ListItemButton>
        ))}
      </List>
    </section>
  );
}
