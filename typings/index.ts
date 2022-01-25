export module Sqlui {
  export type AddConnectionProps = {
    connection: string;
    name: string;
    [index: string]: any;
  };

  export interface ConnectionProps {
    id: string;
    connection: string;
    name: string;
    [index: string]: any;
  }

  export type Column = {
    type: string;
    allowNull: boolean;
    defaultValue?: string;
    comment?: string;
    special?: string;
    primaryKey: boolean;
  };

  export type Result = [any[], any];
}
