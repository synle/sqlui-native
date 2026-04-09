/** MariaDB adapter — thin subclass of MySQLDataAdapter since MariaDB is MySQL-compatible. */
import MySQLDataAdapter from "src/common/adapters/RelationalDataAdapter/mysql/index";

/**
 * Data adapter for MariaDB databases.
 * Extends MySQLDataAdapter since MariaDB uses the MySQL wire protocol.
 * The base class handles `mariadb://` → `mysql://` URL rewriting internally.
 */
export default class MariaDBDataAdapter extends MySQLDataAdapter {}
