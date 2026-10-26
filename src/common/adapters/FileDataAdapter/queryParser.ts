/** Parses and evaluates the safe JavaScript-like query subset used for local document files. */

type DataValue = null | boolean | number | string | Date | undefined | DataValue[] | { [key: string]: DataValue };

type Token = {
  type: "identifier" | "number" | "string" | "operator" | "eof";
  value: string;
};

type Expression =
  | { type: "literal"; value: DataValue }
  | { type: "identifier"; name: string }
  | { type: "member"; object: Expression; property: Expression }
  | { type: "unary"; operator: string; expression: Expression }
  | { type: "binary"; operator: string; left: Expression; right: Expression }
  | { type: "call"; object: Expression; method: string; args: Array<Expression | Lambda> };

type Lambda = {
  type: "lambda";
  parameter: string;
  expression: Expression;
};

type Statement = { type: "assign"; expression: Expression } | { type: "display"; expression: Expression };

type EvaluationContext = {
  resJson: DataValue;
  bindings: Record<string, DataValue>;
  budget: { remaining: number };
};

const MAX_QUERY_LENGTH = 16_384;
const MAX_EVALUATION_STEPS = 100_000;
const FORBIDDEN_PROPERTY_NAMES = new Set(["__proto__", "constructor", "prototype"]);
const OPERATORS = ["===", "!==", ">=", "<=", "=>", "&&", "||", ">", "<", "=", "+", "-", "*", "/", "%", "!"];

/**
 * Evaluates a bounded, non-executable query over parsed data.
 * Supports `res_json` assignment, `display(...)`, property access, comparisons, and safe array methods.
 * @param query - Query text using the supported JavaScript-like syntax.
 * @param data - Parsed document value bound to `res_json`.
 * @returns The value passed to the final `display(...)` statement.
 * @throws SyntaxError when the query uses unsupported syntax or omits `display(...)`.
 * @throws Error when evaluation exceeds its fixed step budget.
 */
export function evaluateDataQuery(query: string, data: DataValue): DataValue {
  if (query.length > MAX_QUERY_LENGTH) {
    throw new SyntaxError(`Query exceeds the ${MAX_QUERY_LENGTH}-character limit.`);
  }

  const statements = new QueryParser(query).parseProgram();
  const budget = { remaining: MAX_EVALUATION_STEPS };
  let resJson = data;
  let displayedValue: DataValue;
  let didDisplay = false;

  for (const statement of statements) {
    const context: EvaluationContext = { resJson, bindings: {}, budget };
    if (statement.type === "assign") {
      resJson = evaluateExpression(statement.expression, context);
      continue;
    }

    displayedValue = evaluateExpression(statement.expression, context);
    didDisplay = true;
  }

  if (!didDisplay) {
    throw new SyntaxError("Query must call display(res_json) to show a result.");
  }

  return displayedValue;
}

/** Parses the query language into bounded statements and expressions. */
class QueryParser {
  private readonly tokens: Token[];
  private position = 0;

  /** Tokenizes source before parsing query statements. */
  constructor(source: string) {
    this.tokens = tokenize(source);
  }

  /** Parses assignments and display calls, separated by semicolons. */
  parseProgram(): Statement[] {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      if (this.match(";")) continue;

      if (this.checkIdentifier("display")) {
        this.advance();
        this.expect("(");
        const expression = this.parseExpression();
        this.expect(")");
        statements.push({ type: "display", expression });
      } else if (this.checkIdentifier("res_json") && this.peekNext().value === "=") {
        this.advance();
        this.advance();
        statements.push({ type: "assign", expression: this.parseExpression() });
      } else {
        throw this.syntaxError(`Expected res_json assignment or display(...), found ${this.current().value || "end of query"}.`);
      }

      if (!this.isAtEnd() && !this.match(";")) {
        throw this.syntaxError("Expected a semicolon between query statements.");
      }
    }

    return statements;
  }

  /** Parses the highest-level expression form. */
  private parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  /** Parses left-associative logical OR expressions. */
  private parseLogicalOr(): Expression {
    let expression = this.parseLogicalAnd();
    while (this.match("||")) {
      expression = { type: "binary", operator: "||", left: expression, right: this.parseLogicalAnd() };
    }
    return expression;
  }

  /** Parses left-associative logical AND expressions. */
  private parseLogicalAnd(): Expression {
    let expression = this.parseEquality();
    while (this.match("&&")) {
      expression = { type: "binary", operator: "&&", left: expression, right: this.parseEquality() };
    }
    return expression;
  }

  /** Parses strict equality expressions. */
  private parseEquality(): Expression {
    let expression = this.parseComparison();
    while (this.match("===", "!==")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseComparison() };
    }
    return expression;
  }

  /** Parses relational comparison expressions. */
  private parseComparison(): Expression {
    let expression = this.parseAdditive();
    while (this.match(">", ">=", "<", "<=")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseAdditive() };
    }
    return expression;
  }

  /** Parses addition and subtraction expressions. */
  private parseAdditive(): Expression {
    let expression = this.parseMultiplicative();
    while (this.match("+", "-")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseMultiplicative() };
    }
    return expression;
  }

  /** Parses multiplication, division, and remainder expressions. */
  private parseMultiplicative(): Expression {
    let expression = this.parseUnary();
    while (this.match("*", "/", "%")) {
      const operator = this.previous().value;
      expression = { type: "binary", operator, left: expression, right: this.parseUnary() };
    }
    return expression;
  }

  /** Parses unary negation and logical NOT expressions. */
  private parseUnary(): Expression {
    if (this.match("!", "-")) {
      return { type: "unary", operator: this.previous().value, expression: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  /** Parses property access, indexing, and allowlisted method calls. */
  private parsePostfix(): Expression {
    let expression = this.parsePrimary();

    while (true) {
      if (this.match(".")) {
        const property = this.expectIdentifier("Expected a property name after '.'.");
        if (this.match("(")) {
          expression = {
            type: "call",
            object: expression,
            method: property.value,
            args: this.parseArguments(),
          };
          continue;
        }
        expression = { type: "member", object: expression, property: { type: "literal", value: property.value } };
        continue;
      }

      if (this.match("[")) {
        const property = this.parseExpression();
        this.expect("]");
        expression = { type: "member", object: expression, property };
        continue;
      }

      return expression;
    }
  }

  /** Parses one method's comma-separated arguments. */
  private parseArguments(): Array<Expression | Lambda> {
    const args: Array<Expression | Lambda> = [];
    if (this.match(")")) return args;

    do {
      args.push(this.isLambdaStart() ? this.parseLambda() : this.parseExpression());
    } while (this.match(","));

    this.expect(")");
    return args;
  }

  /** Parses a single-parameter arrow callback. */
  private parseLambda(): Lambda {
    let parameter: string;
    if (this.match("(")) {
      parameter = this.expectIdentifier("Expected one callback parameter.").value;
      this.expect(")");
    } else {
      parameter = this.expectIdentifier("Expected one callback parameter.").value;
    }

    this.expect("=>");
    return { type: "lambda", parameter, expression: this.parseExpression() };
  }

  /** Checks whether the next argument begins with a supported arrow callback. */
  private isLambdaStart(): boolean {
    if (this.current().type === "identifier" && this.peekNext().value === "=>") return true;
    return this.check("(") && this.peekNext().type === "identifier" && this.peekAt(2).value === ")" && this.peekAt(3).value === "=>";
  }

  /** Parses literals, identifiers, and grouped expressions. */
  private parsePrimary(): Expression {
    if (this.match("(")) {
      const expression = this.parseExpression();
      this.expect(")");
      return expression;
    }

    const token = this.advance();
    if (token.type === "number") return { type: "literal", value: Number(token.value) };
    if (token.type === "string") return { type: "literal", value: decodeString(token.value) };
    if (token.type === "identifier") {
      if (token.value === "true") return { type: "literal", value: true };
      if (token.value === "false") return { type: "literal", value: false };
      if (token.value === "null") return { type: "literal", value: null };
      return { type: "identifier", name: token.value };
    }

    throw this.syntaxError(`Expected a value, found ${token.value || "end of query"}.`);
  }

  /** Consumes an identifier token or throws the supplied syntax error. */
  private expectIdentifier(message = "Expected an identifier."): Token {
    if (this.current().type !== "identifier") throw this.syntaxError(message);
    return this.advance();
  }

  /** Requires the next token to match a delimiter or operator. */
  private expect(value: string): void {
    if (!this.match(value)) throw this.syntaxError(`Expected '${value}'.`);
  }

  /** Consumes the current token when its value matches one of the candidates. */
  private match(...values: string[]): boolean {
    if (!values.includes(this.current().value)) return false;
    this.advance();
    return true;
  }

  /** Checks the current token without consuming it. */
  private check(value: string): boolean {
    return this.current().value === value;
  }

  /** Checks the current token for a specific identifier. */
  private checkIdentifier(value: string): boolean {
    return this.current().type === "identifier" && this.current().value === value;
  }

  /** Returns the current token. */
  private current(): Token {
    return this.tokens[this.position];
  }

  /** Returns the previously consumed token. */
  private previous(): Token {
    return this.tokens[this.position - 1];
  }

  /** Returns the next token without consuming it. */
  private peekNext(): Token {
    return this.peekAt(1);
  }

  /** Returns a token at a relative offset without consuming it. */
  private peekAt(offset: number): Token {
    return this.tokens[Math.min(this.position + offset, this.tokens.length - 1)];
  }

  /** Consumes and returns the current token. */
  private advance(): Token {
    const token = this.current();
    if (token.type !== "eof") this.position++;
    return token;
  }

  /** Checks whether parsing reached the end token. */
  private isAtEnd(): boolean {
    return this.current().type === "eof";
  }

  /** Creates a query-specific syntax error. */
  private syntaxError(message: string): SyntaxError {
    return new SyntaxError(`File query: ${message}`);
  }
}

/** Turns source text into tokens without executing any JavaScript. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }

    if (source.startsWith("//", index)) {
      index = source.indexOf("\n", index + 2);
      if (index < 0) break;
      continue;
    }

    if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new SyntaxError("File query: Unclosed block comment.");
      index = end + 2;
      continue;
    }

    if (char === "'" || char === '"') {
      const start = index++;
      while (index < source.length && source[index] !== char) {
        if (source[index] === "\\") index++;
        index++;
      }
      if (source[index] !== char) throw new SyntaxError("File query: Unclosed string literal.");
      tokens.push({ type: "string", value: source.slice(start, ++index) });
      continue;
    }

    const number = source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: number[0] });
      index += number[0].length;
      continue;
    }

    const identifier = source.slice(index).match(/^[A-Za-z_$][\w$]*/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      index += identifier[0].length;
      continue;
    }

    const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index));
    if (operator) {
      tokens.push({ type: "operator", value: operator });
      index += operator.length;
      continue;
    }

    if (".;()[],".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index++;
      continue;
    }

    throw new SyntaxError(`File query: Unsupported character '${char}'.`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

/** Decodes quoted strings using JSON escapes, with single-quote support. */
function decodeString(token: string): string {
  const content = token.startsWith('"') ? token : `"${token.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`;
  try {
    return JSON.parse(content) as string;
  } catch (err) {
    if (err instanceof SyntaxError) throw new SyntaxError("File query: Invalid string escape.");
    throw err;
  }
}

/** Evaluates a parsed expression using data-only values and explicitly supported operations. */
function evaluateExpression(expression: Expression, context: EvaluationContext): DataValue {
  context.budget.remaining--;
  if (context.budget.remaining < 0) throw new Error("File query exceeded its evaluation limit.");

  if (expression.type === "literal") return expression.value;
  if (expression.type === "identifier") {
    if (expression.name === "res_json") return context.resJson;
    if (Object.prototype.hasOwnProperty.call(context.bindings, expression.name)) return context.bindings[expression.name];
    throw new SyntaxError(`File query: Unknown identifier '${expression.name}'.`);
  }
  if (expression.type === "member") {
    const object = evaluateExpression(expression.object, context);
    const property = evaluateExpression(expression.property, context);
    return getProperty(object, property);
  }
  if (expression.type === "unary") {
    const value = evaluateExpression(expression.expression, context);
    if (expression.operator === "!") return !value;
    if (typeof value !== "number") throw new SyntaxError("File query: Unary '-' requires a number.");
    return -value;
  }
  if (expression.type === "binary") return evaluateBinary(expression, context);
  return evaluateCall(expression, context);
}

/** Applies JavaScript-like short-circuit and comparison operators with no coercive equality. */
function evaluateBinary(expression: Extract<Expression, { type: "binary" }>, context: EvaluationContext): DataValue {
  const left = evaluateExpression(expression.left, context);
  if (expression.operator === "&&") return left && evaluateExpression(expression.right, context);
  if (expression.operator === "||") return left || evaluateExpression(expression.right, context);

  const right = evaluateExpression(expression.right, context);
  switch (expression.operator) {
    case "===":
      return Object.is(left, right);
    case "!==":
      return !Object.is(left, right);
    case ">":
      return compareValues(left, right, (a, b) => a > b);
    case ">=":
      return compareValues(left, right, (a, b) => a >= b);
    case "<":
      return compareValues(left, right, (a, b) => a < b);
    case "<=":
      return compareValues(left, right, (a, b) => a <= b);
    case "+":
      if (typeof left === "number" && typeof right === "number") return left + right;
      if (typeof left === "string" && typeof right === "string") return left + right;
      throw new SyntaxError("File query: '+' requires two numbers or two strings.");
    case "-":
    case "*":
    case "/":
    case "%":
      if (typeof left !== "number" || typeof right !== "number") {
        throw new SyntaxError(`File query: '${expression.operator}' requires numbers.`);
      }
      if (expression.operator === "-") return left - right;
      if (expression.operator === "*") return left * right;
      if (expression.operator === "/") return left / right;
      return left % right;
    default:
      throw new SyntaxError(`File query: Unsupported operator '${expression.operator}'.`);
  }
}

/** Runs a supported array or string method without exposing JavaScript prototypes. */
function evaluateCall(expression: Extract<Expression, { type: "call" }>, context: EvaluationContext): DataValue {
  const receiver = evaluateExpression(expression.object, context);
  const args = expression.args;
  /** Evaluates a predicate or callback with the current item binding. */
  const evaluateItem = (item: DataValue, callback: Expression | Lambda): DataValue => {
    const bindings: Record<string, DataValue> = { ...context.bindings, item };
    const expressionToEvaluate = callback.type === "lambda" ? callback.expression : callback;
    if (callback.type === "lambda") bindings[callback.parameter] = item;
    return evaluateExpression(expressionToEvaluate, { ...context, bindings });
  };

  if (expression.method === "includes" && (Array.isArray(receiver) || typeof receiver === "string")) {
    if (args.length !== 1 || args[0].type === "lambda") throw new SyntaxError("File query: includes() requires one value.");
    const searchValue = evaluateExpression(args[0], context);
    return typeof receiver === "string" ? receiver.includes(String(searchValue)) : receiver.includes(searchValue);
  }

  if (!Array.isArray(receiver)) throw new SyntaxError(`File query: ${expression.method}() requires an array.`);
  const callback = args[0];
  if (expression.method === "filter" || expression.method === "find" || expression.method === "map") {
    if (args.length !== 1 || !callback) throw new SyntaxError(`File query: ${expression.method}() requires one predicate or callback.`);
    if (expression.method === "filter") return receiver.filter((item) => Boolean(evaluateItem(item, callback)));
    if (expression.method === "find") return receiver.find((item) => Boolean(evaluateItem(item, callback)));
    return receiver.map((item) => evaluateItem(item, callback));
  }

  if (expression.method === "slice") {
    if (args.length < 1 || args.length > 2 || args.some((arg) => arg.type === "lambda")) {
      throw new SyntaxError("File query: slice() requires one or two numeric arguments.");
    }
    const values: number[] = [];
    for (const arg of args) {
      if (arg.type === "lambda") throw new SyntaxError("File query: slice() arguments must be integers.");
      const value = evaluateExpression(arg, context);
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new SyntaxError("File query: slice() arguments must be integers.");
      }
      values.push(value);
    }
    return values.length === 1 ? receiver.slice(values[0]) : receiver.slice(values[0], values[1]);
  }

  throw new SyntaxError(`File query: Unsupported method '${expression.method}'.`);
}

/** Reads only own properties and the documented array/string length property. */
function getProperty(object: DataValue, property: DataValue): DataValue {
  if (typeof property !== "string" && typeof property !== "number") {
    throw new SyntaxError("File query: Property access requires a string or numeric key.");
  }
  const key = String(property);
  if (FORBIDDEN_PROPERTY_NAMES.has(key)) throw new SyntaxError(`File query: Property '${key}' is not allowed.`);
  if (Array.isArray(object) && key === "length") return object.length;
  if (typeof object === "string" && key === "length") return object.length;
  if (object === null || typeof object !== "object" || !Object.prototype.hasOwnProperty.call(object, key)) return undefined;
  return (object as { [key: string]: DataValue })[key];
}

/** Compares matching primitive types without JavaScript's implicit coercion. */
function compareValues(left: DataValue, right: DataValue, compare: (a: number | string, b: number | string) => boolean): boolean {
  if (typeof left === "number" && typeof right === "number") return compare(left, right);
  if (typeof left === "string" && typeof right === "string") return compare(left, right);
  return false;
}
