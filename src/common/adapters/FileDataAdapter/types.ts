/** URI schemes handled by the local document adapter. */
export const FILE_DATA_DIALECTS = ["json", "jsonc", "yaml", "yml", "toml", "xml"] as const;

/** Values supported by the document parsers and the restricted query evaluator. */
export type ParsedData = null | boolean | number | string | Date | undefined | ParsedData[] | { [key: string]: ParsedData };
