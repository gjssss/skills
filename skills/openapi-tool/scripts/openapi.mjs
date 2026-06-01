#!/usr/bin/env bun
import { pathToFileURL } from "node:url";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
//#region ../../node_modules/.bun/cac@7.0.0/node_modules/cac/dist/index.js
function toArr(any) {
	return any == null ? [] : Array.isArray(any) ? any : [any];
}
function toVal(out, key, val, opts) {
	var x, old = out[key], nxt = !!~opts.string.indexOf(key) ? val == null || val === true ? "" : String(val) : typeof val === "boolean" ? val : !!~opts.boolean.indexOf(key) ? val === "false" ? false : val === "true" || (out._.push((x = +val, x * 0 === 0) ? x : val), !!val) : (x = +val, x * 0 === 0) ? x : val;
	out[key] = old == null ? nxt : Array.isArray(old) ? old.concat(nxt) : [old, nxt];
}
function lib_default(args, opts) {
	args = args || [];
	opts = opts || {};
	var k, arr, arg, name, val, out = { _: [] };
	var i = 0, j = 0, idx = 0, len = args.length;
	const alibi = opts.alias !== void 0;
	const strict = opts.unknown !== void 0;
	const defaults = opts.default !== void 0;
	opts.alias = opts.alias || {};
	opts.string = toArr(opts.string);
	opts.boolean = toArr(opts.boolean);
	if (alibi) for (k in opts.alias) {
		arr = opts.alias[k] = toArr(opts.alias[k]);
		for (i = 0; i < arr.length; i++) (opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
	}
	for (i = opts.boolean.length; i-- > 0;) {
		arr = opts.alias[opts.boolean[i]] || [];
		for (j = arr.length; j-- > 0;) opts.boolean.push(arr[j]);
	}
	for (i = opts.string.length; i-- > 0;) {
		arr = opts.alias[opts.string[i]] || [];
		for (j = arr.length; j-- > 0;) opts.string.push(arr[j]);
	}
	if (defaults) for (k in opts.default) {
		name = typeof opts.default[k];
		arr = opts.alias[k] = opts.alias[k] || [];
		if (opts[name] !== void 0) {
			opts[name].push(k);
			for (i = 0; i < arr.length; i++) opts[name].push(arr[i]);
		}
	}
	const keys = strict ? Object.keys(opts.alias) : [];
	for (i = 0; i < len; i++) {
		arg = args[i];
		if (arg === "--") {
			out._ = out._.concat(args.slice(++i));
			break;
		}
		for (j = 0; j < arg.length; j++) if (arg.charCodeAt(j) !== 45) break;
		if (j === 0) out._.push(arg);
		else if (arg.substring(j, j + 3) === "no-") {
			name = arg.substring(j + 3);
			if (strict && !~keys.indexOf(name)) return opts.unknown(arg);
			out[name] = false;
		} else {
			for (idx = j + 1; idx < arg.length; idx++) if (arg.charCodeAt(idx) === 61) break;
			name = arg.substring(j, idx);
			val = arg.substring(++idx) || i + 1 === len || ("" + args[i + 1]).charCodeAt(0) === 45 || args[++i];
			arr = j === 2 ? [name] : name;
			for (idx = 0; idx < arr.length; idx++) {
				name = arr[idx];
				if (strict && !~keys.indexOf(name)) return opts.unknown("-".repeat(j) + name);
				toVal(out, name, idx + 1 < arr.length || val, opts);
			}
		}
	}
	if (defaults) {
		for (k in opts.default) if (out[k] === void 0) out[k] = opts.default[k];
	}
	if (alibi) for (k in out) {
		arr = opts.alias[k] || [];
		while (arr.length > 0) out[arr.shift()] = out[k];
	}
	return out;
}
function removeBrackets(v) {
	return v.replace(/[<[].+/, "").trim();
}
function findAllBrackets(v) {
	const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
	const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
	const res = [];
	const parse = (match) => {
		let variadic = false;
		let value = match[1];
		if (value.startsWith("...")) {
			value = value.slice(3);
			variadic = true;
		}
		return {
			required: match[0].startsWith("<"),
			value,
			variadic
		};
	};
	let angledMatch;
	while (angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(angledMatch));
	let squareMatch;
	while (squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(squareMatch));
	return res;
}
function getMriOptions(options) {
	const result = {
		alias: {},
		boolean: []
	};
	for (const [index, option] of options.entries()) {
		if (option.names.length > 1) result.alias[option.names[0]] = option.names.slice(1);
		if (option.isBoolean) if (option.negated) {
			if (!options.some((o, i) => {
				return i !== index && o.names.some((name) => option.names.includes(name)) && typeof o.required === "boolean";
			})) result.boolean.push(option.names[0]);
		} else result.boolean.push(option.names[0]);
	}
	return result;
}
function findLongest(arr) {
	return arr.sort((a, b) => {
		return a.length > b.length ? -1 : 1;
	})[0];
}
function padRight(str, length) {
	return str.length >= length ? str : `${str}${" ".repeat(length - str.length)}`;
}
function camelcase(input) {
	return input.replaceAll(/([a-z])-([a-z])/g, (_, p1, p2) => {
		return p1 + p2.toUpperCase();
	});
}
function setDotProp(obj, keys, val) {
	let current = obj;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (i === keys.length - 1) {
			current[key] = val;
			return;
		}
		if (current[key] == null) {
			const nextKeyIsArrayIndex = +keys[i + 1] > -1;
			current[key] = nextKeyIsArrayIndex ? [] : {};
		}
		current = current[key];
	}
}
function setByType(obj, transforms) {
	for (const key of Object.keys(transforms)) {
		const transform = transforms[key];
		if (transform.shouldTransform) {
			obj[key] = [obj[key]].flat();
			if (typeof transform.transformFunction === "function") obj[key] = obj[key].map(transform.transformFunction);
		}
	}
}
function getFileName(input) {
	const m = /([^\\/]+)$/.exec(input);
	return m ? m[1] : "";
}
function camelcaseOptionName(name) {
	return name.split(".").map((v, i) => {
		return i === 0 ? camelcase(v) : v;
	}).join(".");
}
var CACError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "CACError";
		if (typeof Error.captureStackTrace !== "function") this.stack = new Error(message).stack;
	}
};
var Option = class {
	rawName;
	description;
	/** Option name */
	name;
	/** Option name and aliases */
	names;
	isBoolean;
	required;
	config;
	negated;
	constructor(rawName, description, config) {
		this.rawName = rawName;
		this.description = description;
		this.config = Object.assign({}, config);
		rawName = rawName.replaceAll(".*", "");
		this.negated = false;
		this.names = removeBrackets(rawName).split(",").map((v) => {
			let name = v.trim().replace(/^-{1,2}/, "");
			if (name.startsWith("no-")) {
				this.negated = true;
				name = name.replace(/^no-/, "");
			}
			return camelcaseOptionName(name);
		}).sort((a, b) => a.length > b.length ? 1 : -1);
		this.name = this.names.at(-1);
		if (this.negated && this.config.default == null) this.config.default = true;
		if (rawName.includes("<")) this.required = true;
		else if (rawName.includes("[")) this.required = false;
		else this.isBoolean = true;
	}
};
var runtimeProcessArgs;
var runtimeInfo;
if (typeof process !== "undefined") {
	let runtimeName;
	if (typeof Deno !== "undefined" && typeof Deno.version?.deno === "string") runtimeName = "deno";
	else if (typeof Bun !== "undefined" && typeof Bun.version === "string") runtimeName = "bun";
	else runtimeName = "node";
	runtimeInfo = `${process.platform}-${process.arch} ${runtimeName}-${process.version}`;
	runtimeProcessArgs = process.argv;
} else if (typeof navigator === "undefined") runtimeInfo = `unknown`;
else runtimeInfo = `${navigator.platform} ${navigator.userAgent}`;
var Command = class {
	rawName;
	description;
	config;
	cli;
	options;
	aliasNames;
	name;
	args;
	commandAction;
	usageText;
	versionNumber;
	examples;
	helpCallback;
	globalCommand;
	constructor(rawName, description, config = {}, cli) {
		this.rawName = rawName;
		this.description = description;
		this.config = config;
		this.cli = cli;
		this.options = [];
		this.aliasNames = [];
		this.name = removeBrackets(rawName);
		this.args = findAllBrackets(rawName);
		this.examples = [];
	}
	usage(text) {
		this.usageText = text;
		return this;
	}
	allowUnknownOptions() {
		this.config.allowUnknownOptions = true;
		return this;
	}
	ignoreOptionDefaultValue() {
		this.config.ignoreOptionDefaultValue = true;
		return this;
	}
	version(version, customFlags = "-v, --version") {
		this.versionNumber = version;
		this.option(customFlags, "Display version number");
		return this;
	}
	example(example) {
		this.examples.push(example);
		return this;
	}
	/**
	* Add a option for this command
	* @param rawName Raw option name(s)
	* @param description Option description
	* @param config Option config
	*/
	option(rawName, description, config) {
		const option = new Option(rawName, description, config);
		this.options.push(option);
		return this;
	}
	alias(name) {
		this.aliasNames.push(name);
		return this;
	}
	action(callback) {
		this.commandAction = callback;
		return this;
	}
	/**
	* Check if a command name is matched by this command
	* @param name Command name
	*/
	isMatched(name) {
		return this.name === name || this.aliasNames.includes(name);
	}
	get isDefaultCommand() {
		return this.name === "" || this.aliasNames.includes("!");
	}
	get isGlobalCommand() {
		return this instanceof GlobalCommand;
	}
	/**
	* Check if an option is registered in this command
	* @param name Option name
	*/
	hasOption(name) {
		name = name.split(".")[0];
		return this.options.find((option) => {
			return option.names.includes(name);
		});
	}
	outputHelp() {
		const { name, commands } = this.cli;
		const { versionNumber, options: globalOptions, helpCallback } = this.cli.globalCommand;
		let sections = [{ body: `${name}${versionNumber ? `/${versionNumber}` : ""}` }];
		sections.push({
			title: "Usage",
			body: `  $ ${name} ${this.usageText || this.rawName}`
		});
		if ((this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0) {
			const longestCommandName = findLongest(commands.map((command) => command.rawName));
			sections.push({
				title: "Commands",
				body: commands.map((command) => {
					return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
				}).join("\n")
			}, {
				title: `For more info, run any command with the \`--help\` flag`,
				body: commands.map((command) => `  $ ${name}${command.name === "" ? "" : ` ${command.name}`} --help`).join("\n")
			});
		}
		let options = this.isGlobalCommand ? globalOptions : [...this.options, ...globalOptions || []];
		if (!this.isGlobalCommand && !this.isDefaultCommand) options = options.filter((option) => option.name !== "version");
		if (options.length > 0) {
			const longestOptionName = findLongest(options.map((option) => option.rawName));
			sections.push({
				title: "Options",
				body: options.map((option) => {
					return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === void 0 ? "" : `(default: ${option.config.default})`}`;
				}).join("\n")
			});
		}
		if (this.examples.length > 0) sections.push({
			title: "Examples",
			body: this.examples.map((example) => {
				if (typeof example === "function") return example(name);
				return example;
			}).join("\n")
		});
		if (helpCallback) sections = helpCallback(sections) || sections;
		console.info(sections.map((section) => {
			return section.title ? `${section.title}:\n${section.body}` : section.body;
		}).join("\n\n"));
	}
	outputVersion() {
		const { name } = this.cli;
		const { versionNumber } = this.cli.globalCommand;
		if (versionNumber) console.info(`${name}/${versionNumber} ${runtimeInfo}`);
	}
	checkRequiredArgs() {
		const minimalArgsCount = this.args.filter((arg) => arg.required).length;
		if (this.cli.args.length < minimalArgsCount) throw new CACError(`missing required args for command \`${this.rawName}\``);
	}
	/**
	* Check if the parsed options contain any unknown options
	*
	* Exit and output error when true
	*/
	checkUnknownOptions() {
		const { options, globalCommand } = this.cli;
		if (!this.config.allowUnknownOptions) {
			for (const name of Object.keys(options)) if (name !== "--" && !this.hasOption(name) && !globalCommand.hasOption(name)) throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
		}
	}
	/**
	* Check if the required string-type options exist
	*/
	checkOptionValue() {
		const { options: parsedOptions, globalCommand } = this.cli;
		const options = [...globalCommand.options, ...this.options];
		for (const option of options) {
			const value = parsedOptions[option.name.split(".")[0]];
			if (option.required) {
				const hasNegated = options.some((o) => o.negated && o.names.includes(option.name));
				if (value === true || value === false && !hasNegated) throw new CACError(`option \`${option.rawName}\` value is missing`);
			}
		}
	}
	/**
	* Check if the number of args is more than expected
	*/
	checkUnusedArgs() {
		const maximumArgsCount = this.args.some((arg) => arg.variadic) ? Infinity : this.args.length;
		if (maximumArgsCount < this.cli.args.length) throw new CACError(`Unused args: ${this.cli.args.slice(maximumArgsCount).map((arg) => `\`${arg}\``).join(", ")}`);
	}
};
var GlobalCommand = class extends Command {
	constructor(cli) {
		super("@@global@@", "", {}, cli);
	}
};
var CAC = class extends EventTarget {
	/** The program name to display in help and version message */
	name;
	commands;
	globalCommand;
	matchedCommand;
	matchedCommandName;
	/**
	* Raw CLI arguments
	*/
	rawArgs;
	/**
	* Parsed CLI arguments
	*/
	args;
	/**
	* Parsed CLI options, camelCased
	*/
	options;
	showHelpOnExit;
	showVersionOnExit;
	/**
	* @param name The program name to display in help and version message
	*/
	constructor(name = "") {
		super();
		this.name = name;
		this.commands = [];
		this.rawArgs = [];
		this.args = [];
		this.options = {};
		this.globalCommand = new GlobalCommand(this);
		this.globalCommand.usage("<command> [options]");
	}
	/**
	* Add a global usage text.
	*
	* This is not used by sub-commands.
	*/
	usage(text) {
		this.globalCommand.usage(text);
		return this;
	}
	/**
	* Add a sub-command
	*/
	command(rawName, description, config) {
		const command = new Command(rawName, description || "", config, this);
		command.globalCommand = this.globalCommand;
		this.commands.push(command);
		return command;
	}
	/**
	* Add a global CLI option.
	*
	* Which is also applied to sub-commands.
	*/
	option(rawName, description, config) {
		this.globalCommand.option(rawName, description, config);
		return this;
	}
	/**
	* Show help message when `-h, --help` flags appear.
	*
	*/
	help(callback) {
		this.globalCommand.option("-h, --help", "Display this message");
		this.globalCommand.helpCallback = callback;
		this.showHelpOnExit = true;
		return this;
	}
	/**
	* Show version number when `-v, --version` flags appear.
	*
	*/
	version(version, customFlags = "-v, --version") {
		this.globalCommand.version(version, customFlags);
		this.showVersionOnExit = true;
		return this;
	}
	/**
	* Add a global example.
	*
	* This example added here will not be used by sub-commands.
	*/
	example(example) {
		this.globalCommand.example(example);
		return this;
	}
	/**
	* Output the corresponding help message
	* When a sub-command is matched, output the help message for the command
	* Otherwise output the global one.
	*
	*/
	outputHelp() {
		if (this.matchedCommand) this.matchedCommand.outputHelp();
		else this.globalCommand.outputHelp();
	}
	/**
	* Output the version number.
	*
	*/
	outputVersion() {
		this.globalCommand.outputVersion();
	}
	setParsedInfo({ args, options }, matchedCommand, matchedCommandName) {
		this.args = args;
		this.options = options;
		if (matchedCommand) this.matchedCommand = matchedCommand;
		if (matchedCommandName) this.matchedCommandName = matchedCommandName;
		return this;
	}
	unsetMatchedCommand() {
		this.matchedCommand = void 0;
		this.matchedCommandName = void 0;
	}
	/**
	* Parse argv
	*/
	parse(argv, { run = true } = {}) {
		if (!argv) {
			if (!runtimeProcessArgs) throw new Error("No argv provided and runtime process argv is not available.");
			argv = runtimeProcessArgs;
		}
		this.rawArgs = argv;
		if (!this.name) this.name = argv[1] ? getFileName(argv[1]) : "cli";
		let shouldParse = true;
		for (const command of this.commands) {
			const parsed = this.mri(argv.slice(2), command);
			const commandName = parsed.args[0];
			if (command.isMatched(commandName)) {
				shouldParse = false;
				const parsedInfo = {
					...parsed,
					args: parsed.args.slice(1)
				};
				this.setParsedInfo(parsedInfo, command, commandName);
				this.dispatchEvent(new CustomEvent(`command:${commandName}`, { detail: command }));
			}
		}
		if (shouldParse) {
			for (const command of this.commands) if (command.isDefaultCommand) {
				shouldParse = false;
				const parsed = this.mri(argv.slice(2), command);
				this.setParsedInfo(parsed, command);
				this.dispatchEvent(new CustomEvent("command:!", { detail: command }));
			}
		}
		if (shouldParse) {
			const parsed = this.mri(argv.slice(2));
			this.setParsedInfo(parsed);
		}
		if (this.options.help && this.showHelpOnExit) {
			this.outputHelp();
			run = false;
			this.unsetMatchedCommand();
		}
		if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
			this.outputVersion();
			run = false;
			this.unsetMatchedCommand();
		}
		const parsedArgv = {
			args: this.args,
			options: this.options
		};
		if (run) this.runMatchedCommand();
		if (!this.matchedCommand && this.args[0]) this.dispatchEvent(new CustomEvent("command:*", { detail: this.args[0] }));
		return parsedArgv;
	}
	mri(argv, command) {
		const cliOptions = [...this.globalCommand.options, ...command ? command.options : []];
		const mriOptions = getMriOptions(cliOptions);
		let argsAfterDoubleDashes = [];
		const doubleDashesIndex = argv.indexOf("--");
		if (doubleDashesIndex !== -1) {
			argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
			argv = argv.slice(0, doubleDashesIndex);
		}
		let parsed = lib_default(argv, mriOptions);
		parsed = Object.keys(parsed).reduce((res, name) => {
			return {
				...res,
				[camelcaseOptionName(name)]: parsed[name]
			};
		}, { _: [] });
		const args = parsed._;
		const options = { "--": argsAfterDoubleDashes };
		const ignoreDefault = command && command.config.ignoreOptionDefaultValue ? command.config.ignoreOptionDefaultValue : this.globalCommand.config.ignoreOptionDefaultValue;
		const transforms = Object.create(null);
		for (const cliOption of cliOptions) {
			if (!ignoreDefault && cliOption.config.default !== void 0) for (const name of cliOption.names) options[name] = cliOption.config.default;
			if (Array.isArray(cliOption.config.type) && transforms[cliOption.name] === void 0) {
				transforms[cliOption.name] = Object.create(null);
				transforms[cliOption.name].shouldTransform = true;
				transforms[cliOption.name].transformFunction = cliOption.config.type[0];
			}
		}
		for (const key of Object.keys(parsed)) if (key !== "_") {
			setDotProp(options, key.split("."), parsed[key]);
			setByType(options, transforms);
		}
		return {
			args,
			options
		};
	}
	runMatchedCommand() {
		const { args, options, matchedCommand: command } = this;
		if (!command || !command.commandAction) return;
		command.checkUnknownOptions();
		command.checkOptionValue();
		command.checkRequiredArgs();
		command.checkUnusedArgs();
		const actionArgs = [];
		command.args.forEach((arg, index) => {
			if (arg.variadic) actionArgs.push(args.slice(index));
			else actionArgs.push(args[index]);
		});
		actionArgs.push(options);
		return command.commandAction.apply(this, actionArgs);
	}
};
/**
* @param name The program name to display in help and version message
*/
var cac = (name = "") => new CAC(name);
//#endregion
//#region src/core/json.ts
function isJsonObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonArray(value) {
	return Array.isArray(value);
}
function getString(value) {
	return typeof value === "string" ? value : null;
}
function cloneJsonObject(value) {
	return structuredClone(value);
}
//#endregion
//#region src/core/collect-operations.ts
var HTTP_METHODS = new Set([
	"get",
	"put",
	"post",
	"delete",
	"options",
	"head",
	"patch",
	"trace"
]);
function collectOperations(document) {
	if (!isJsonObject(document.paths)) return [];
	const operations = [];
	for (const [path, pathItemValue] of Object.entries(document.paths)) {
		if (!isJsonObject(pathItemValue)) continue;
		const pathParameters = normalizeParameters(pathItemValue.parameters);
		for (const [method, operationValue] of Object.entries(pathItemValue)) {
			if (!HTTP_METHODS.has(method) || !isJsonObject(operationValue)) continue;
			if (operationValue.deprecated === true) continue;
			const summary = getString(operationValue.summary);
			const operationId = getString(operationValue.operationId);
			const name = summary ?? operationId ?? `${method.toUpperCase()} ${path}`;
			const tags = isJsonArray(operationValue.tags) ? operationValue.tags.filter((tag) => typeof tag === "string") : [];
			operations.push({
				index: operations.length,
				name,
				path,
				method,
				pathWithMethod: `${method.toUpperCase()} ${path}`,
				tags,
				operationId,
				summary,
				description: getString(operationValue.description),
				operation: operationValue,
				pathParameters
			});
		}
	}
	return operations;
}
function toListItem(operation) {
	return {
		index: operation.index,
		name: operation.name,
		path: operation.path,
		method: operation.method,
		pathWithMethod: operation.pathWithMethod,
		tags: operation.tags,
		operationId: operation.operationId
	};
}
function mergeParameters(pathParameters, operationParametersValue) {
	const operationParameters = normalizeParameters(operationParametersValue);
	const result = [...pathParameters];
	for (const parameter of operationParameters) {
		if (!isJsonObject(parameter)) {
			result.push(parameter);
			continue;
		}
		const key = parameterKey(parameter);
		const existingIndex = key === null ? -1 : result.findIndex((item) => isJsonObject(item) && parameterKey(item) === key);
		if (existingIndex >= 0) result[existingIndex] = parameter;
		else result.push(parameter);
	}
	return result;
}
function normalizeParameters(value) {
	return isJsonArray(value) ? value : [];
}
function parameterKey(parameter) {
	const name = getString(parameter.name);
	const location = getString(parameter.in);
	return name && location ? `${location}:${name}` : null;
}
//#endregion
//#region src/core/filter-deprecated.ts
function filterDeprecated(value) {
	return filterValue(value);
}
function filterValue(value) {
	if (isJsonArray(value)) return filterArray(value);
	if (isJsonObject(value)) return filterObject(value);
	return value;
}
function filterArray(value) {
	const result = [];
	for (const item of value) {
		const filtered = filterValue(item);
		if (filtered !== void 0) result.push(filtered);
	}
	return result;
}
function filterObject(value) {
	if (value.deprecated === true) return;
	const result = {};
	for (const [key, child] of Object.entries(value)) {
		const filtered = filterValue(child);
		if (filtered !== void 0) result[key] = filtered;
	}
	syncRequiredWithProperties(result);
	return result;
}
function syncRequiredWithProperties(value) {
	if (!isJsonObject(value.properties) || !isJsonArray(value.required)) return;
	const propertyNames = new Set(Object.keys(value.properties));
	value.required = value.required.filter((item) => typeof item === "string" && propertyNames.has(item));
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR$1 = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR$1;
var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
function isCollection(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case MAP:
		case SEQ: return true;
	}
	return false;
}
function isNode(node) {
	if (node && typeof node === "object") switch (node[NODE_TYPE]) {
		case ALIAS:
		case MAP:
		case SCALAR$1:
		case SEQ: return true;
	}
	return false;
}
var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/visit.js
var BREAK$1 = Symbol("break visit");
var SKIP$1 = Symbol("skip children");
var REMOVE$1 = Symbol("remove node");
/**
* Apply a visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
function visit$1(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (visit_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else visit_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visit$1.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visit$1.SKIP = SKIP$1;
/** Remove the current node */
visit$1.REMOVE = REMOVE$1;
function visit_(key, node, visitor, path) {
	const ctrl = callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visit_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = visit_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = visit_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = visit_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
/**
* Apply an async visitor to an AST node or document.
*
* Walks through the tree (depth-first) starting from `node`, calling a
* `visitor` function with three arguments:
*   - `key`: For sequence values and map `Pair`, the node's index in the
*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
*     `null` for the root node.
*   - `node`: The current node.
*   - `path`: The ancestry of the current node.
*
* The return value of the visitor may be used to control the traversal:
*   - `Promise`: Must resolve to one of the following values
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this node, continue with next
*     sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current node, then continue with the next one
*   - `Node`: Replace the current node, then continue by visiting it
*   - `number`: While iterating the items of a sequence or map, set the index
*     of the next step. This is useful especially if the index of the current
*     node has changed.
*
* If `visitor` is a single function, it will be called with all values
* encountered in the tree, including e.g. `null` values. Alternatively,
* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
* `Alias` and `Scalar` node. To define the same visitor function for more than
* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
* specific defined one will be used for each node.
*/
async function visitAsync(node, visitor) {
	const visitor_ = initVisitor(visitor);
	if (isDocument(node)) {
		if (await visitAsync_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE$1) node.contents = null;
	} else await visitAsync_(null, node, visitor_, Object.freeze([]));
}
/** Terminate visit traversal completely */
visitAsync.BREAK = BREAK$1;
/** Do not visit the children of the current node */
visitAsync.SKIP = SKIP$1;
/** Remove the current node */
visitAsync.REMOVE = REMOVE$1;
async function visitAsync_(key, node, visitor, path) {
	const ctrl = await callVisitor(key, node, visitor, path);
	if (isNode(ctrl) || isPair(ctrl)) {
		replaceNode(key, path, ctrl);
		return visitAsync_(key, ctrl, visitor, path);
	}
	if (typeof ctrl !== "symbol") {
		if (isCollection(node)) {
			path = Object.freeze(path.concat(node));
			for (let i = 0; i < node.items.length; ++i) {
				const ci = await visitAsync_(i, node.items[i], visitor, path);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK$1) return BREAK$1;
				else if (ci === REMOVE$1) {
					node.items.splice(i, 1);
					i -= 1;
				}
			}
		} else if (isPair(node)) {
			path = Object.freeze(path.concat(node));
			const ck = await visitAsync_("key", node.key, visitor, path);
			if (ck === BREAK$1) return BREAK$1;
			else if (ck === REMOVE$1) node.key = null;
			const cv = await visitAsync_("value", node.value, visitor, path);
			if (cv === BREAK$1) return BREAK$1;
			else if (cv === REMOVE$1) node.value = null;
		}
	}
	return ctrl;
}
function initVisitor(visitor) {
	if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) return Object.assign({
		Alias: visitor.Node,
		Map: visitor.Node,
		Scalar: visitor.Node,
		Seq: visitor.Node
	}, visitor.Value && {
		Map: visitor.Value,
		Scalar: visitor.Value,
		Seq: visitor.Value
	}, visitor.Collection && {
		Map: visitor.Collection,
		Seq: visitor.Collection
	}, visitor);
	return visitor;
}
function callVisitor(key, node, visitor, path) {
	if (typeof visitor === "function") return visitor(key, node, path);
	if (isMap(node)) return visitor.Map?.(key, node, path);
	if (isSeq(node)) return visitor.Seq?.(key, node, path);
	if (isPair(node)) return visitor.Pair?.(key, node, path);
	if (isScalar(node)) return visitor.Scalar?.(key, node, path);
	if (isAlias(node)) return visitor.Alias?.(key, node, path);
}
function replaceNode(key, path, node) {
	const parent = path[path.length - 1];
	if (isCollection(parent)) parent.items[key] = node;
	else if (isPair(parent)) if (key === "key") parent.key = node;
	else parent.value = node;
	else if (isDocument(parent)) parent.contents = node;
	else {
		const pt = isAlias(parent) ? "alias" : "scalar";
		throw new Error(`Cannot replace node with ${pt} parent`);
	}
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
	"!": "%21",
	",": "%2C",
	"[": "%5B",
	"]": "%5D",
	"{": "%7B",
	"}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class Directives {
	constructor(yaml, tags) {
		/**
		* The directives-end/doc-start marker `---`. If `null`, a marker may still be
		* included in the document's stringified representation.
		*/
		this.docStart = null;
		/** The doc-end marker `...`.  */
		this.docEnd = false;
		this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
		this.tags = Object.assign({}, Directives.defaultTags, tags);
	}
	clone() {
		const copy = new Directives(this.yaml, this.tags);
		copy.docStart = this.docStart;
		return copy;
	}
	/**
	* During parsing, get a Directives instance for the current document and
	* update the stream state according to the current version's spec.
	*/
	atDocument() {
		const res = new Directives(this.yaml, this.tags);
		switch (this.yaml.version) {
			case "1.1":
				this.atNextDocument = true;
				break;
			case "1.2":
				this.atNextDocument = false;
				this.yaml = {
					explicit: Directives.defaultYaml.explicit,
					version: "1.2"
				};
				this.tags = Object.assign({}, Directives.defaultTags);
				break;
		}
		return res;
	}
	/**
	* @param onError - May be called even if the action was successful
	* @returns `true` on success
	*/
	add(line, onError) {
		if (this.atNextDocument) {
			this.yaml = {
				explicit: Directives.defaultYaml.explicit,
				version: "1.1"
			};
			this.tags = Object.assign({}, Directives.defaultTags);
			this.atNextDocument = false;
		}
		const parts = line.trim().split(/[ \t]+/);
		const name = parts.shift();
		switch (name) {
			case "%TAG": {
				if (parts.length !== 2) {
					onError(0, "%TAG directive should contain exactly two parts");
					if (parts.length < 2) return false;
				}
				const [handle, prefix] = parts;
				this.tags[handle] = prefix;
				return true;
			}
			case "%YAML": {
				this.yaml.explicit = true;
				if (parts.length !== 1) {
					onError(0, "%YAML directive should contain exactly one part");
					return false;
				}
				const [version] = parts;
				if (version === "1.1" || version === "1.2") {
					this.yaml.version = version;
					return true;
				} else {
					const isValid = /^\d+\.\d+$/.test(version);
					onError(6, `Unsupported YAML version ${version}`, isValid);
					return false;
				}
			}
			default:
				onError(0, `Unknown directive ${name}`, true);
				return false;
		}
	}
	/**
	* Resolves a tag, matching handles to those defined in %TAG directives.
	*
	* @returns Resolved tag, which may also be the non-specific tag `'!'` or a
	*   `'!local'` tag, or `null` if unresolvable.
	*/
	tagName(source, onError) {
		if (source === "!") return "!";
		if (source[0] !== "!") {
			onError(`Not a valid tag: ${source}`);
			return null;
		}
		if (source[1] === "<") {
			const verbatim = source.slice(2, -1);
			if (verbatim === "!" || verbatim === "!!") {
				onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
				return null;
			}
			if (source[source.length - 1] !== ">") onError("Verbatim tags must end with a >");
			return verbatim;
		}
		const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
		if (!suffix) onError(`The ${source} tag has no suffix`);
		const prefix = this.tags[handle];
		if (prefix) try {
			return prefix + decodeURIComponent(suffix);
		} catch (error) {
			onError(String(error));
			return null;
		}
		if (handle === "!") return source;
		onError(`Could not resolve tag: ${source}`);
		return null;
	}
	/**
	* Given a fully resolved tag, returns its printable string form,
	* taking into account current tag prefixes and defaults.
	*/
	tagString(tag) {
		for (const [handle, prefix] of Object.entries(this.tags)) if (tag.startsWith(prefix)) return handle + escapeTagName(tag.substring(prefix.length));
		return tag[0] === "!" ? tag : `!<${tag}>`;
	}
	toString(doc) {
		const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
		const tagEntries = Object.entries(this.tags);
		let tagNames;
		if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
			const tags = {};
			visit$1(doc.contents, (_key, node) => {
				if (isNode(node) && node.tag) tags[node.tag] = true;
			});
			tagNames = Object.keys(tags);
		} else tagNames = [];
		for (const [handle, prefix] of tagEntries) {
			if (handle === "!!" && prefix === "tag:yaml.org,2002:") continue;
			if (!doc || tagNames.some((tn) => tn.startsWith(prefix))) lines.push(`%TAG ${handle} ${prefix}`);
		}
		return lines.join("\n");
	}
};
Directives.defaultYaml = {
	explicit: false,
	version: "1.2"
};
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/doc/anchors.js
/**
* Verify that the input string is a valid anchor.
*
* Will throw on errors.
*/
function anchorIsValid(anchor) {
	if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
		const msg = `Anchor must not contain whitespace or control characters: ${JSON.stringify(anchor)}`;
		throw new Error(msg);
	}
	return true;
}
function anchorNames(root) {
	const anchors = /* @__PURE__ */ new Set();
	visit$1(root, { Value(_key, node) {
		if (node.anchor) anchors.add(node.anchor);
	} });
	return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
function findNewAnchor(prefix, exclude) {
	for (let i = 1;; ++i) {
		const name = `${prefix}${i}`;
		if (!exclude.has(name)) return name;
	}
}
function createNodeAnchors(doc, prefix) {
	const aliasObjects = [];
	const sourceObjects = /* @__PURE__ */ new Map();
	let prevAnchors = null;
	return {
		onAnchor: (source) => {
			aliasObjects.push(source);
			prevAnchors ?? (prevAnchors = anchorNames(doc));
			const anchor = findNewAnchor(prefix, prevAnchors);
			prevAnchors.add(anchor);
			return anchor;
		},
		/**
		* With circular references, the source node is only resolved after all
		* of its child nodes are. This is why anchors are set only after all of
		* the nodes have been created.
		*/
		setAnchors: () => {
			for (const source of aliasObjects) {
				const ref = sourceObjects.get(source);
				if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) ref.node.anchor = ref.anchor;
				else {
					const error = /* @__PURE__ */ new Error("Failed to resolve repeated object (this should not happen)");
					error.source = source;
					throw error;
				}
			}
		},
		sourceObjects
	};
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/doc/applyReviver.js
/**
* Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
* in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
* 2021 edition: https://tc39.es/ecma262/#sec-json.parse
*
* Includes extensions for handling Map and Set objects.
*/
function applyReviver(reviver, obj, key, val) {
	if (val && typeof val === "object") if (Array.isArray(val)) for (let i = 0, len = val.length; i < len; ++i) {
		const v0 = val[i];
		const v1 = applyReviver(reviver, val, String(i), v0);
		if (v1 === void 0) delete val[i];
		else if (v1 !== v0) val[i] = v1;
	}
	else if (val instanceof Map) for (const k of Array.from(val.keys())) {
		const v0 = val.get(k);
		const v1 = applyReviver(reviver, val, k, v0);
		if (v1 === void 0) val.delete(k);
		else if (v1 !== v0) val.set(k, v1);
	}
	else if (val instanceof Set) for (const v0 of Array.from(val)) {
		const v1 = applyReviver(reviver, val, v0, v0);
		if (v1 === void 0) val.delete(v0);
		else if (v1 !== v0) {
			val.delete(v0);
			val.add(v1);
		}
	}
	else for (const [k, v0] of Object.entries(val)) {
		const v1 = applyReviver(reviver, val, k, v0);
		if (v1 === void 0) delete val[k];
		else if (v1 !== v0) val[k] = v1;
	}
	return reviver.call(obj, key, val);
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/toJS.js
/**
* Recursively convert any node or its contents to native JavaScript
*
* @param value - The input value
* @param arg - If `value` defines a `toJSON()` method, use this
*   as its first argument
* @param ctx - Conversion context, originally set in Document#toJS(). If
*   `{ keep: true }` is not set, output should be suitable for JSON
*   stringification.
*/
function toJS(value, arg, ctx) {
	if (Array.isArray(value)) return value.map((v, i) => toJS(v, String(i), ctx));
	if (value && typeof value.toJSON === "function") {
		if (!ctx || !hasAnchor(value)) return value.toJSON(arg, ctx);
		const data = {
			aliasCount: 0,
			count: 1,
			res: void 0
		};
		ctx.anchors.set(value, data);
		ctx.onCreate = (res) => {
			data.res = res;
			delete ctx.onCreate;
		};
		const res = value.toJSON(arg, ctx);
		if (ctx.onCreate) ctx.onCreate(res);
		return res;
	}
	if (typeof value === "bigint" && !ctx?.keep) return Number(value);
	return value;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
	constructor(type) {
		Object.defineProperty(this, NODE_TYPE, { value: type });
	}
	/** Create a copy of this node.  */
	clone() {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** A plain JavaScript representation of this node. */
	toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		if (!isDocument(doc)) throw new TypeError("A document argument is required");
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc,
			keep: true,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this, "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
	constructor(source) {
		super(ALIAS);
		this.source = source;
		Object.defineProperty(this, "tag", { set() {
			throw new Error("Alias nodes cannot have tags");
		} });
	}
	/**
	* Resolve the value of this alias within `doc`, finding the last
	* instance of the `source` anchor before this node.
	*/
	resolve(doc, ctx) {
		if (ctx?.maxAliasCount === 0) throw new ReferenceError("Alias resolution is disabled");
		let nodes;
		if (ctx?.aliasResolveCache) nodes = ctx.aliasResolveCache;
		else {
			nodes = [];
			visit$1(doc, { Node: (_key, node) => {
				if (isAlias(node) || hasAnchor(node)) nodes.push(node);
			} });
			if (ctx) ctx.aliasResolveCache = nodes;
		}
		let found = void 0;
		for (const node of nodes) {
			if (node === this) break;
			if (node.anchor === this.source) found = node;
		}
		return found;
	}
	toJSON(_arg, ctx) {
		if (!ctx) return { source: this.source };
		const { anchors, doc, maxAliasCount } = ctx;
		const source = this.resolve(doc, ctx);
		if (!source) {
			const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
			throw new ReferenceError(msg);
		}
		let data = anchors.get(source);
		if (!data) {
			toJS(source, null, ctx);
			data = anchors.get(source);
		}
		/* istanbul ignore if */
		if (data?.res === void 0) throw new ReferenceError("This should not happen: Alias anchor was not resolved?");
		if (maxAliasCount >= 0) {
			data.count += 1;
			if (data.aliasCount === 0) data.aliasCount = getAliasCount(doc, source, anchors);
			if (data.count * data.aliasCount > maxAliasCount) throw new ReferenceError("Excessive alias count indicates a resource exhaustion attack");
		}
		return data.res;
	}
	toString(ctx, _onComment, _onChompKeep) {
		const src = `*${this.source}`;
		if (ctx) {
			anchorIsValid(this.source);
			if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
				const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
				throw new Error(msg);
			}
			if (ctx.implicitKey) return `${src} `;
		}
		return src;
	}
};
function getAliasCount(doc, node, anchors) {
	if (isAlias(node)) {
		const source = node.resolve(doc);
		const anchor = anchors && source && anchors.get(source);
		return anchor ? anchor.count * anchor.aliasCount : 0;
	} else if (isCollection(node)) {
		let count = 0;
		for (const item of node.items) {
			const c = getAliasCount(doc, item, anchors);
			if (c > count) count = c;
		}
		return count;
	} else if (isPair(node)) {
		const kc = getAliasCount(doc, node.key, anchors);
		const vc = getAliasCount(doc, node.value, anchors);
		return Math.max(kc, vc);
	}
	return 1;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
	constructor(value) {
		super(SCALAR$1);
		this.value = value;
	}
	toJSON(arg, ctx) {
		return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
	}
	toString() {
		return String(this.value);
	}
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
	if (tagName) {
		const match = tags.filter((t) => t.tag === tagName);
		const tagObj = match.find((t) => !t.format) ?? match[0];
		if (!tagObj) throw new Error(`Tag ${tagName} not found`);
		return tagObj;
	}
	return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
	if (isDocument(value)) value = value.contents;
	if (isNode(value)) return value;
	if (isPair(value)) {
		const map = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
		map.items.push(value);
		return map;
	}
	if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) value = value.valueOf();
	const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
	let ref = void 0;
	if (aliasDuplicateObjects && value && typeof value === "object") {
		ref = sourceObjects.get(value);
		if (ref) {
			ref.anchor ?? (ref.anchor = onAnchor(value));
			return new Alias(ref.anchor);
		} else {
			ref = {
				anchor: null,
				node: null
			};
			sourceObjects.set(value, ref);
		}
	}
	if (tagName?.startsWith("!!")) tagName = defaultTagPrefix + tagName.slice(2);
	let tagObj = findTagObject(value, tagName, schema.tags);
	if (!tagObj) {
		if (value && typeof value.toJSON === "function") value = value.toJSON();
		if (!value || typeof value !== "object") {
			const node = new Scalar(value);
			if (ref) ref.node = node;
			return node;
		}
		tagObj = value instanceof Map ? schema[MAP] : Symbol.iterator in Object(value) ? schema[SEQ] : schema[MAP];
	}
	if (onTagObj) {
		onTagObj(tagObj);
		delete ctx.onTagObj;
	}
	const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
	if (tagName) node.tag = tagName;
	else if (!tagObj.default) node.tag = tagObj.tag;
	if (ref) ref.node = node;
	return node;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema, path, value) {
	let v = value;
	for (let i = path.length - 1; i >= 0; --i) {
		const k = path[i];
		if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
			const a = [];
			a[k] = v;
			v = a;
		} else v = new Map([[k, v]]);
	}
	return createNode(v, void 0, {
		aliasDuplicateObjects: false,
		keepUndefined: false,
		onAnchor: () => {
			throw new Error("This should not happen, please report a bug.");
		},
		schema,
		sourceObjects: /* @__PURE__ */ new Map()
	});
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
	constructor(type, schema) {
		super(type);
		Object.defineProperty(this, "schema", {
			value: schema,
			configurable: true,
			enumerable: false,
			writable: true
		});
	}
	/**
	* Create a copy of this collection.
	*
	* @param schema - If defined, overwrites the original's schema
	*/
	clone(schema) {
		const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		if (schema) copy.schema = schema;
		copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema) : it);
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/**
	* Adds a value to the collection. For `!!map` and `!!omap` the value must
	* be a Pair instance or a `{ key, value }` object, which may not have a key
	* that already exists in the map.
	*/
	addIn(path, value) {
		if (isEmptyPath(path)) this.add(value);
		else {
			const [key, ...rest] = path;
			const node = this.get(key, true);
			if (isCollection(node)) node.addIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
	/**
	* Removes a value from the collection.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.delete(key);
		const node = this.get(key, true);
		if (isCollection(node)) return node.deleteIn(rest);
		else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		const [key, ...rest] = path;
		const node = this.get(key, true);
		if (rest.length === 0) return !keepScalar && isScalar(node) ? node.value : node;
		else return isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
	}
	hasAllNullValues(allowScalar) {
		return this.items.every((node) => {
			if (!isPair(node)) return false;
			const n = node.value;
			return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
		});
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*/
	hasIn(path) {
		const [key, ...rest] = path;
		if (rest.length === 0) return this.has(key);
		const node = this.get(key, true);
		return isCollection(node) ? node.hasIn(rest) : false;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		const [key, ...rest] = path;
		if (rest.length === 0) this.set(key, value);
		else {
			const node = this.get(key, true);
			if (isCollection(node)) node.setIn(rest, value);
			else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyComment.js
/**
* Stringifies a comment.
*
* Empty comment lines are left empty,
* lines consisting of a single space are replaced by `#`,
* and all other lines are prefixed with a `#`.
*/
var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
	if (/^\n+$/.test(comment)) return comment.substring(1);
	return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
/**
* Tries to keep input at up to `lineWidth` characters, splitting only on spaces
* not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
* terminated with `\n` and started with `indent`.
*/
function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
	if (!lineWidth || lineWidth < 0) return text;
	if (lineWidth < minContentWidth) minContentWidth = 0;
	const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
	if (text.length <= endStep) return text;
	const folds = [];
	const escapedFolds = {};
	let end = lineWidth - indent.length;
	if (typeof indentAtStart === "number") if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);
	else end = lineWidth - indentAtStart;
	let split = void 0;
	let prev = void 0;
	let overflow = false;
	let i = -1;
	let escStart = -1;
	let escEnd = -1;
	if (mode === "block") {
		i = consumeMoreIndentedLines(text, i, indent.length);
		if (i !== -1) end = i + endStep;
	}
	for (let ch; ch = text[i += 1];) {
		if (mode === "quoted" && ch === "\\") {
			escStart = i;
			switch (text[i + 1]) {
				case "x":
					i += 3;
					break;
				case "u":
					i += 5;
					break;
				case "U":
					i += 9;
					break;
				default: i += 1;
			}
			escEnd = i;
		}
		if (ch === "\n") {
			if (mode === "block") i = consumeMoreIndentedLines(text, i, indent.length);
			end = i + indent.length + endStep;
			split = void 0;
		} else {
			if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
				const next = text[i + 1];
				if (next && next !== " " && next !== "\n" && next !== "	") split = i;
			}
			if (i >= end) if (split) {
				folds.push(split);
				end = split + endStep;
				split = void 0;
			} else if (mode === "quoted") {
				while (prev === " " || prev === "	") {
					prev = ch;
					ch = text[i += 1];
					overflow = true;
				}
				const j = i > escEnd + 1 ? i - 2 : escStart - 1;
				if (escapedFolds[j]) return text;
				folds.push(j);
				escapedFolds[j] = true;
				end = j + endStep;
				split = void 0;
			} else overflow = true;
		}
		prev = ch;
	}
	if (overflow && onOverflow) onOverflow();
	if (folds.length === 0) return text;
	if (onFold) onFold();
	let res = text.slice(0, folds[0]);
	for (let i = 0; i < folds.length; ++i) {
		const fold = folds[i];
		const end = folds[i + 1] || text.length;
		if (fold === 0) res = `\n${indent}${text.slice(0, end)}`;
		else {
			if (mode === "quoted" && escapedFolds[fold]) res += `${text[fold]}\\`;
			res += `\n${indent}${text.slice(fold + 1, end)}`;
		}
	}
	return res;
}
/**
* Presumes `i + 1` is at the start of a line
* @returns index of last newline in more-indented block
*/
function consumeMoreIndentedLines(text, i, indent) {
	let end = i;
	let start = i + 1;
	let ch = text[start];
	while (ch === " " || ch === "	") if (i < start + indent) ch = text[++i];
	else {
		do
			ch = text[++i];
		while (ch && ch !== "\n");
		end = i;
		start = i + 1;
		ch = text[start];
	}
	return end;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock) => ({
	indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
	lineWidth: ctx.options.lineWidth,
	minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
	if (!lineWidth || lineWidth < 0) return false;
	const limit = lineWidth - indentLength;
	const strLen = str.length;
	if (strLen <= limit) return false;
	for (let i = 0, start = 0; i < strLen; ++i) if (str[i] === "\n") {
		if (i - start > limit) return true;
		start = i + 1;
		if (strLen - start <= limit) return false;
	}
	return true;
}
function doubleQuotedString(value, ctx) {
	const json = JSON.stringify(value);
	if (ctx.options.doubleQuotedAsJSON) return json;
	const { implicitKey } = ctx;
	const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	let str = "";
	let start = 0;
	for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
		if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
			str += json.slice(start, i) + "\\ ";
			i += 1;
			start = i;
			ch = "\\";
		}
		if (ch === "\\") switch (json[i + 1]) {
			case "u":
				{
					str += json.slice(start, i);
					const code = json.substr(i + 2, 4);
					switch (code) {
						case "0000":
							str += "\\0";
							break;
						case "0007":
							str += "\\a";
							break;
						case "000b":
							str += "\\v";
							break;
						case "001b":
							str += "\\e";
							break;
						case "0085":
							str += "\\N";
							break;
						case "00a0":
							str += "\\_";
							break;
						case "2028":
							str += "\\L";
							break;
						case "2029":
							str += "\\P";
							break;
						default: if (code.substr(0, 2) === "00") str += "\\x" + code.substr(2);
						else str += json.substr(i, 6);
					}
					i += 5;
					start = i + 1;
				}
				break;
			case "n":
				if (implicitKey || json[i + 2] === "\"" || json.length < minMultiLineLength) i += 1;
				else {
					str += json.slice(start, i) + "\n\n";
					while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== "\"") {
						str += "\n";
						i += 2;
					}
					str += indent;
					if (json[i + 2] === " ") str += "\\";
					i += 1;
					start = i + 1;
				}
				break;
			default: i += 1;
		}
	}
	str = start ? str + json.slice(start) : json;
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
	if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
	const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
	const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
	return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
	const { singleQuote } = ctx.options;
	let qs;
	if (singleQuote === false) qs = doubleQuotedString;
	else {
		const hasDouble = value.includes("\"");
		const hasSingle = value.includes("'");
		if (hasDouble && !hasSingle) qs = singleQuotedString;
		else if (hasSingle && !hasDouble) qs = doubleQuotedString;
		else qs = singleQuote ? singleQuotedString : doubleQuotedString;
	}
	return qs(value, ctx);
}
var blockEndNewlines;
try {
	blockEndNewlines = /* @__PURE__ */ new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch {
	blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
	const { blockQuote, commentString, lineWidth } = ctx.options;
	if (!blockQuote || /\n[\t ]+$/.test(value)) return quotedString(value, ctx);
	const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
	const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
	if (!value) return literal ? "|\n" : ">\n";
	let chomp;
	let endStart;
	for (endStart = value.length; endStart > 0; --endStart) {
		const ch = value[endStart - 1];
		if (ch !== "\n" && ch !== "	" && ch !== " ") break;
	}
	let end = value.substring(endStart);
	const endNlPos = end.indexOf("\n");
	if (endNlPos === -1) chomp = "-";
	else if (value === end || endNlPos !== end.length - 1) {
		chomp = "+";
		if (onChompKeep) onChompKeep();
	} else chomp = "";
	if (end) {
		value = value.slice(0, -end.length);
		if (end[end.length - 1] === "\n") end = end.slice(0, -1);
		end = end.replace(blockEndNewlines, `$&${indent}`);
	}
	let startWithSpace = false;
	let startEnd;
	let startNlPos = -1;
	for (startEnd = 0; startEnd < value.length; ++startEnd) {
		const ch = value[startEnd];
		if (ch === " ") startWithSpace = true;
		else if (ch === "\n") startNlPos = startEnd;
		else break;
	}
	let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
	if (start) {
		value = value.substring(start.length);
		start = start.replace(/\n+/g, `$&${indent}`);
	}
	let header = (startWithSpace ? indent ? "2" : "1" : "") + chomp;
	if (comment) {
		header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
		if (onComment) onComment();
	}
	if (!literal) {
		const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
		let literalFallback = false;
		const foldOptions = getFoldOptions(ctx, true);
		if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) foldOptions.onOverflow = () => {
			literalFallback = true;
		};
		const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
		if (!literalFallback) return `>${header}\n${indent}${body}`;
	}
	value = value.replace(/\n+/g, `$&${indent}`);
	return `|${header}\n${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
	const { type, value } = item;
	const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
	if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) return quotedString(value, ctx);
	if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
	if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) return blockString(item, ctx, onComment, onChompKeep);
	if (containsDocumentMarker(value)) {
		if (indent === "") {
			ctx.forceBlockIndent = true;
			return blockString(item, ctx, onComment, onChompKeep);
		} else if (implicitKey && indent === indentStep) return quotedString(value, ctx);
	}
	const str = value.replace(/\n+/g, `$&\n${indent}`);
	if (actualString) {
		const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
		const { compat, tags } = ctx.doc.schema;
		if (tags.some(test) || compat?.some(test)) return quotedString(value, ctx);
	}
	return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
	const { implicitKey, inFlow } = ctx;
	const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
	let { type } = item;
	if (type !== Scalar.QUOTE_DOUBLE) {
		if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value)) type = Scalar.QUOTE_DOUBLE;
	}
	const _stringify = (_type) => {
		switch (_type) {
			case Scalar.BLOCK_FOLDED:
			case Scalar.BLOCK_LITERAL: return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
			case Scalar.QUOTE_DOUBLE: return doubleQuotedString(ss.value, ctx);
			case Scalar.QUOTE_SINGLE: return singleQuotedString(ss.value, ctx);
			case Scalar.PLAIN: return plainString(ss, ctx, onComment, onChompKeep);
			default: return null;
		}
	};
	let res = _stringify(type);
	if (res === null) {
		const { defaultKeyType, defaultStringType } = ctx.options;
		const t = implicitKey && defaultKeyType || defaultStringType;
		res = _stringify(t);
		if (res === null) throw new Error(`Unsupported default string type ${t}`);
	}
	return res;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
	const opt = Object.assign({
		blockQuote: true,
		commentString: stringifyComment,
		defaultKeyType: null,
		defaultStringType: "PLAIN",
		directives: null,
		doubleQuotedAsJSON: false,
		doubleQuotedMinMultiLineLength: 40,
		falseStr: "false",
		flowCollectionPadding: true,
		indentSeq: true,
		lineWidth: 80,
		minContentWidth: 20,
		nullStr: "null",
		simpleKeys: false,
		singleQuote: null,
		trailingComma: false,
		trueStr: "true",
		verifyAliasOrder: true
	}, doc.schema.toStringOptions, options);
	let inFlow;
	switch (opt.collectionStyle) {
		case "block":
			inFlow = false;
			break;
		case "flow":
			inFlow = true;
			break;
		default: inFlow = null;
	}
	return {
		anchors: /* @__PURE__ */ new Set(),
		doc,
		flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
		indent: "",
		indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
		inFlow,
		options: opt
	};
}
function getTagObject(tags, item) {
	if (item.tag) {
		const match = tags.filter((t) => t.tag === item.tag);
		if (match.length > 0) return match.find((t) => t.format === item.format) ?? match[0];
	}
	let tagObj = void 0;
	let obj;
	if (isScalar(item)) {
		obj = item.value;
		let match = tags.filter((t) => t.identify?.(obj));
		if (match.length > 1) {
			const testMatch = match.filter((t) => t.test);
			if (testMatch.length > 0) match = testMatch;
		}
		tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
	} else {
		obj = item;
		tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
	}
	if (!tagObj) {
		const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
		throw new Error(`Tag not resolved for ${name} value`);
	}
	return tagObj;
}
function stringifyProps(node, tagObj, { anchors, doc }) {
	if (!doc.directives) return "";
	const props = [];
	const anchor = (isScalar(node) || isCollection(node)) && node.anchor;
	if (anchor && anchorIsValid(anchor)) {
		anchors.add(anchor);
		props.push(`&${anchor}`);
	}
	const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
	if (tag) props.push(doc.directives.tagString(tag));
	return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
	if (isPair(item)) return item.toString(ctx, onComment, onChompKeep);
	if (isAlias(item)) {
		if (ctx.doc.directives) return item.toString(ctx);
		if (ctx.resolvedAliases?.has(item)) throw new TypeError(`Cannot stringify circular structure without alias nodes`);
		else {
			if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);
			else ctx.resolvedAliases = new Set([item]);
			item = item.resolve(ctx.doc);
		}
	}
	let tagObj = void 0;
	const node = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
	tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
	const props = stringifyProps(node, tagObj, ctx);
	if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
	const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
	if (!props) return str;
	return isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
	const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
	let keyComment = isNode(key) && key.comment || null;
	if (simpleKeys) {
		if (keyComment) throw new Error("With simple keys, key nodes cannot have comments");
		if (isCollection(key) || !isNode(key) && typeof key === "object") throw new Error("With simple keys, collection cannot be used as a key value");
	}
	let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
	ctx = Object.assign({}, ctx, {
		allNullValues: false,
		implicitKey: !explicitKey && (simpleKeys || !allNullValues),
		indent: indent + indentStep
	});
	let keyCommentDone = false;
	let chompKeep = false;
	let str = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
	if (!explicitKey && !ctx.inFlow && str.length > 1024) {
		if (simpleKeys) throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
		explicitKey = true;
	}
	if (ctx.inFlow) {
		if (allNullValues || value == null) {
			if (keyCommentDone && onComment) onComment();
			return str === "" ? "?" : explicitKey ? `? ${str}` : str;
		}
	} else if (allNullValues && !simpleKeys || value == null && explicitKey) {
		str = `? ${str}`;
		if (keyComment && !keyCommentDone) str += lineComment(str, ctx.indent, commentString(keyComment));
		else if (chompKeep && onChompKeep) onChompKeep();
		return str;
	}
	if (keyCommentDone) keyComment = null;
	if (explicitKey) {
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
		str = `? ${str}\n${indent}:`;
	} else {
		str = `${str}:`;
		if (keyComment) str += lineComment(str, ctx.indent, commentString(keyComment));
	}
	let vsb, vcb, valueComment;
	if (isNode(value)) {
		vsb = !!value.spaceBefore;
		vcb = value.commentBefore;
		valueComment = value.comment;
	} else {
		vsb = false;
		vcb = null;
		valueComment = null;
		if (value && typeof value === "object") value = doc.createNode(value);
	}
	ctx.implicitKey = false;
	if (!explicitKey && !keyComment && isScalar(value)) ctx.indentAtStart = str.length + 1;
	chompKeep = false;
	if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) ctx.indent = ctx.indent.substring(2);
	let valueCommentDone = false;
	const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
	let ws = " ";
	if (keyComment || vsb || vcb) {
		ws = vsb ? "\n" : "";
		if (vcb) {
			const cs = commentString(vcb);
			ws += `\n${indentComment(cs, ctx.indent)}`;
		}
		if (valueStr === "" && !ctx.inFlow) {
			if (ws === "\n" && valueComment) ws = "\n\n";
		} else ws += `\n${ctx.indent}`;
	} else if (!explicitKey && isCollection(value)) {
		const vs0 = valueStr[0];
		const nl0 = valueStr.indexOf("\n");
		const hasNewline = nl0 !== -1;
		const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
		if (hasNewline || !flow) {
			let hasPropsLine = false;
			if (hasNewline && (vs0 === "&" || vs0 === "!")) {
				let sp0 = valueStr.indexOf(" ");
				if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") sp0 = valueStr.indexOf(" ", sp0 + 1);
				if (sp0 === -1 || nl0 < sp0) hasPropsLine = true;
			}
			if (!hasPropsLine) ws = `\n${ctx.indent}`;
		}
	} else if (valueStr === "" || valueStr[0] === "\n") ws = "";
	str += ws + valueStr;
	if (ctx.inFlow) {
		if (valueCommentDone && onComment) onComment();
	} else if (valueComment && !valueCommentDone) str += lineComment(str, ctx.indent, commentString(valueComment));
	else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
	if (logLevel === "debug" || logLevel === "warn") console.warn(warning);
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge$2 = {
	identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
	default: "key",
	tag: "tag:yaml.org,2002:merge",
	test: /^<<$/,
	resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), { addToJSMap: addMergeToJSMap }),
	stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge$2.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge$2.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge$2.tag && tag.default);
function addMergeToJSMap(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (isSeq(source)) for (const it of source.items) mergeValue(ctx, map, it);
	else if (Array.isArray(source)) for (const it of source) mergeValue(ctx, map, it);
	else mergeValue(ctx, map, source);
}
function mergeValue(ctx, map, value) {
	const source = resolveAliasValue(ctx, value);
	if (!isMap(source)) throw new Error("Merge sources must be maps or map aliases");
	const srcMap = source.toJSON(null, ctx, Map);
	for (const [key, value] of srcMap) if (map instanceof Map) {
		if (!map.has(key)) map.set(key, value);
	} else if (map instanceof Set) map.add(key);
	else if (!Object.prototype.hasOwnProperty.call(map, key)) Object.defineProperty(map, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
	return map;
}
function resolveAliasValue(ctx, value) {
	return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map, { key, value }) {
	if (isNode(key) && key.addToJSMap) key.addToJSMap(ctx, map, value);
	else if (isMergeKey(ctx, key)) addMergeToJSMap(ctx, map, value);
	else {
		const jsKey = toJS(key, "", ctx);
		if (map instanceof Map) map.set(jsKey, toJS(value, jsKey, ctx));
		else if (map instanceof Set) map.add(jsKey);
		else {
			const stringKey = stringifyKey(key, jsKey, ctx);
			const jsValue = toJS(value, stringKey, ctx);
			if (stringKey in map) Object.defineProperty(map, stringKey, {
				value: jsValue,
				writable: true,
				enumerable: true,
				configurable: true
			});
			else map[stringKey] = jsValue;
		}
	}
	return map;
}
function stringifyKey(key, jsKey, ctx) {
	if (jsKey === null) return "";
	if (typeof jsKey !== "object") return String(jsKey);
	if (isNode(key) && ctx?.doc) {
		const strCtx = createStringifyContext(ctx.doc, {});
		strCtx.anchors = /* @__PURE__ */ new Set();
		for (const node of ctx.anchors.keys()) strCtx.anchors.add(node.anchor);
		strCtx.inFlow = true;
		strCtx.inStringifyKey = true;
		const strKey = key.toString(strCtx);
		if (!ctx.mapKeyWarned) {
			let jsonStr = JSON.stringify(strKey);
			if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + "...\"";
			warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
			ctx.mapKeyWarned = true;
		}
		return strKey;
	}
	return JSON.stringify(jsKey);
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
	return new Pair(createNode(key, void 0, ctx), createNode(value, void 0, ctx));
}
var Pair = class Pair {
	constructor(key, value = null) {
		Object.defineProperty(this, NODE_TYPE, { value: PAIR });
		this.key = key;
		this.value = value;
	}
	clone(schema) {
		let { key, value } = this;
		if (isNode(key)) key = key.clone(schema);
		if (isNode(value)) value = value.clone(schema);
		return new Pair(key, value);
	}
	toJSON(_, ctx) {
		return addPairToJSMap(ctx, ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {}, this);
	}
	toString(ctx, onComment, onChompKeep) {
		return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
	return (ctx.inFlow ?? collection.flow ? stringifyFlowCollection : stringifyBlockCollection)(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
	const { indent, options: { commentString } } = ctx;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		type: null
	});
	let chompKeep = false;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (!chompKeep && item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (!chompKeep && ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
			}
		}
		chompKeep = false;
		let str = stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		if (chompKeep && comment) chompKeep = false;
		lines.push(blockItemPrefix + str);
	}
	let str;
	if (lines.length === 0) str = flowChars.start + flowChars.end;
	else {
		str = lines[0];
		for (let i = 1; i < lines.length; ++i) {
			const line = lines[i];
			str += line ? `\n${indent}${line}` : "\n";
		}
	}
	if (comment) {
		str += "\n" + indentComment(commentString(comment), indent);
		if (onComment) onComment();
	} else if (chompKeep && onChompKeep) onChompKeep();
	return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
	const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
	itemIndent += indentStep;
	const itemCtx = Object.assign({}, ctx, {
		indent: itemIndent,
		inFlow: true,
		type: null
	});
	let reqNewline = false;
	let linesAtValue = 0;
	const lines = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		let comment = null;
		if (isNode(item)) {
			if (item.spaceBefore) lines.push("");
			addCommentBefore(ctx, lines, item.commentBefore, false);
			if (item.comment) comment = item.comment;
		} else if (isPair(item)) {
			const ik = isNode(item.key) ? item.key : null;
			if (ik) {
				if (ik.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, ik.commentBefore, false);
				if (ik.comment) reqNewline = true;
			}
			const iv = isNode(item.value) ? item.value : null;
			if (iv) {
				if (iv.comment) comment = iv.comment;
				if (iv.commentBefore) reqNewline = true;
			} else if (item.value == null && ik?.comment) comment = ik.comment;
		}
		if (comment) reqNewline = true;
		let str = stringify(item, itemCtx, () => comment = null);
		reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
		if (i < items.length - 1) str += ",";
		else if (ctx.options.trailingComma) {
			if (ctx.options.lineWidth > 0) reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
			if (reqNewline) str += ",";
		}
		if (comment) str += lineComment(str, itemIndent, commentString(comment));
		lines.push(str);
		linesAtValue = lines.length;
	}
	const { start, end } = flowChars;
	if (lines.length === 0) return start + end;
	else {
		if (!reqNewline) {
			const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
			reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
		}
		if (reqNewline) {
			let str = start;
			for (const line of lines) str += line ? `\n${indentStep}${indent}${line}` : "\n";
			return `${str}\n${indent}${end}`;
		} else return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
	}
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
	if (comment && chompKeep) comment = comment.replace(/^\n+/, "");
	if (comment) {
		const ic = indentComment(commentString(comment), indent);
		lines.push(ic.trimStart());
	}
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
	const k = isScalar(key) ? key.value : key;
	for (const it of items) if (isPair(it)) {
		if (it.key === key || it.key === k) return it;
		if (isScalar(it.key) && it.key.value === k) return it;
	}
}
var YAMLMap = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:map";
	}
	constructor(schema) {
		super(MAP, schema);
		this.items = [];
	}
	/**
	* A generic collection parsing method that can be extended
	* to other node classes that inherit from YAMLMap
	*/
	static from(schema, obj, ctx) {
		const { keepUndefined, replacer } = ctx;
		const map = new this(schema);
		const add = (key, value) => {
			if (typeof replacer === "function") value = replacer.call(obj, key, value);
			else if (Array.isArray(replacer) && !replacer.includes(key)) return;
			if (value !== void 0 || keepUndefined) map.items.push(createPair(key, value, ctx));
		};
		if (obj instanceof Map) for (const [key, value] of obj) add(key, value);
		else if (obj && typeof obj === "object") for (const key of Object.keys(obj)) add(key, obj[key]);
		if (typeof schema.sortMapEntries === "function") map.items.sort(schema.sortMapEntries);
		return map;
	}
	/**
	* Adds a value to the collection.
	*
	* @param overwrite - If not set `true`, using a key that is already in the
	*   collection will throw. Otherwise, overwrites the previous value.
	*/
	add(pair, overwrite) {
		let _pair;
		if (isPair(pair)) _pair = pair;
		else if (!pair || typeof pair !== "object" || !("key" in pair)) _pair = new Pair(pair, pair?.value);
		else _pair = new Pair(pair.key, pair.value);
		const prev = findPair(this.items, _pair.key);
		const sortEntries = this.schema?.sortMapEntries;
		if (prev) {
			if (!overwrite) throw new Error(`Key ${_pair.key} already set`);
			if (isScalar(prev.value) && isScalarValue(_pair.value)) prev.value.value = _pair.value;
			else prev.value = _pair.value;
		} else if (sortEntries) {
			const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
			if (i === -1) this.items.push(_pair);
			else this.items.splice(i, 0, _pair);
		} else this.items.push(_pair);
	}
	delete(key) {
		const it = findPair(this.items, key);
		if (!it) return false;
		return this.items.splice(this.items.indexOf(it), 1).length > 0;
	}
	get(key, keepScalar) {
		const node = findPair(this.items, key)?.value;
		return (!keepScalar && isScalar(node) ? node.value : node) ?? void 0;
	}
	has(key) {
		return !!findPair(this.items, key);
	}
	set(key, value) {
		this.add(new Pair(key, value), true);
	}
	/**
	* @param ctx - Conversion context, originally set in Document#toJS()
	* @param {Class} Type - If set, forces the returned collection type
	* @returns Instance of Type, Map, or Object
	*/
	toJSON(_, ctx, Type) {
		const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const item of this.items) addPairToJSMap(ctx, map, item);
		return map;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		for (const item of this.items) if (!isPair(item)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
		if (!ctx.allNullValues && this.hasAllNullValues(false)) ctx = Object.assign({}, ctx, { allNullValues: true });
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "",
			flowChars: {
				start: "{",
				end: "}"
			},
			itemIndent: ctx.indent || "",
			onChompKeep,
			onComment
		});
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/common/map.js
var map$1 = {
	collection: "map",
	default: true,
	nodeClass: YAMLMap,
	tag: "tag:yaml.org,2002:map",
	resolve(map, onError) {
		if (!isMap(map)) onError("Expected a mapping for this tag");
		return map;
	},
	createNode: (schema, obj, ctx) => YAMLMap.from(schema, obj, ctx)
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
	static get tagName() {
		return "tag:yaml.org,2002:seq";
	}
	constructor(schema) {
		super(SEQ, schema);
		this.items = [];
	}
	add(value) {
		this.items.push(value);
	}
	/**
	* Removes a value from the collection.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return false;
		return this.items.splice(idx, 1).length > 0;
	}
	get(key, keepScalar) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") return void 0;
		const it = this.items[idx];
		return !keepScalar && isScalar(it) ? it.value : it;
	}
	/**
	* Checks if the collection includes a value with the key `key`.
	*
	* `key` must contain a representation of an integer for this to succeed.
	* It may be wrapped in a `Scalar`.
	*/
	has(key) {
		const idx = asItemIndex(key);
		return typeof idx === "number" && idx < this.items.length;
	}
	/**
	* Sets a value in this collection. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*
	* If `key` does not contain a representation of an integer, this will throw.
	* It may be wrapped in a `Scalar`.
	*/
	set(key, value) {
		const idx = asItemIndex(key);
		if (typeof idx !== "number") throw new Error(`Expected a valid index, not ${key}.`);
		const prev = this.items[idx];
		if (isScalar(prev) && isScalarValue(value)) prev.value = value;
		else this.items[idx] = value;
	}
	toJSON(_, ctx) {
		const seq = [];
		if (ctx?.onCreate) ctx.onCreate(seq);
		let i = 0;
		for (const item of this.items) seq.push(toJS(item, String(i++), ctx));
		return seq;
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		return stringifyCollection(this, ctx, {
			blockItemPrefix: "- ",
			flowChars: {
				start: "[",
				end: "]"
			},
			itemIndent: (ctx.indent || "") + "  ",
			onChompKeep,
			onComment
		});
	}
	static from(schema, obj, ctx) {
		const { replacer } = ctx;
		const seq = new this(schema);
		if (obj && Symbol.iterator in Object(obj)) {
			let i = 0;
			for (let it of obj) {
				if (typeof replacer === "function") {
					const key = obj instanceof Set ? it : String(i++);
					it = replacer.call(obj, key, it);
				}
				seq.items.push(createNode(it, void 0, ctx));
			}
		}
		return seq;
	}
};
function asItemIndex(key) {
	let idx = isScalar(key) ? key.value : key;
	if (idx && typeof idx === "string") idx = Number(idx);
	return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/common/seq.js
var seq$1 = {
	collection: "seq",
	default: true,
	nodeClass: YAMLSeq,
	tag: "tag:yaml.org,2002:seq",
	resolve(seq, onError) {
		if (!isSeq(seq)) onError("Expected a sequence for this tag");
		return seq;
	},
	createNode: (schema, obj, ctx) => YAMLSeq.from(schema, obj, ctx)
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/common/string.js
var string = {
	identify: (value) => typeof value === "string",
	default: true,
	tag: "tag:yaml.org,2002:str",
	resolve: (str) => str,
	stringify(item, ctx, onComment, onChompKeep) {
		ctx = Object.assign({ actualString: true }, ctx);
		return stringifyString(item, ctx, onComment, onChompKeep);
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/common/null.js
var nullTag = {
	identify: (value) => value == null,
	createNode: () => new Scalar(null),
	default: true,
	tag: "tag:yaml.org,2002:null",
	test: /^(?:~|[Nn]ull|NULL)?$/,
	resolve: () => new Scalar(null),
	stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag = {
	identify: (value) => typeof value === "boolean",
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
	resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
	stringify({ source, value }, ctx) {
		if (source && boolTag.test.test(source)) {
			if (value === (source[0] === "t" || source[0] === "T")) return source;
		}
		return value ? ctx.options.trueStr : ctx.options.falseStr;
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
	if (typeof value === "bigint") return String(value);
	const num = typeof value === "number" ? value : Number(value);
	if (!isFinite(num)) return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
	let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
	if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
		let i = n.indexOf(".");
		if (i < 0) {
			i = n.length;
			n += ".";
		}
		let d = minFractionDigits - (n.length - i - 1);
		while (d-- > 0) n += "0";
	}
	return n;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float$2 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str));
		const dot = str.indexOf(".");
		if (dot !== -1 && str[str.length - 1] === "0") node.minFractionDigits = str.length - dot - 1;
		return node;
	},
	stringify: stringifyNumber
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/core/int.js
var intIdentify$2 = (value) => typeof value === "bigint" || Number.isInteger(value);
var intResolve$1 = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
function intStringify$1(node, radix, prefix) {
	const { value } = node;
	if (intIdentify$2(value) && value >= 0) return prefix + value.toString(radix);
	return stringifyNumber(node);
}
var intOct$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^0o[0-7]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 8, opt),
	stringify: (node) => intStringify$1(node, 8, "0o")
};
var int$2 = {
	identify: intIdentify$2,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex$1 = {
	identify: (value) => intIdentify$2(value) && value >= 0,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^0x[0-9a-fA-F]+$/,
	resolve: (str, _onError, opt) => intResolve$1(str, 2, 16, opt),
	stringify: (node) => intStringify$1(node, 16, "0x")
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/core/schema.js
var schema$3 = [
	map$1,
	seq$1,
	string,
	nullTag,
	boolTag,
	intOct$1,
	int$2,
	intHex$1,
	floatNaN$1,
	floatExp$1,
	float$2
];
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify$1(value) {
	return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
	{
		identify: (value) => typeof value === "string",
		default: true,
		tag: "tag:yaml.org,2002:str",
		resolve: (str) => str,
		stringify: stringifyJSON
	},
	{
		identify: (value) => value == null,
		createNode: () => new Scalar(null),
		default: true,
		tag: "tag:yaml.org,2002:null",
		test: /^null$/,
		resolve: () => null,
		stringify: stringifyJSON
	},
	{
		identify: (value) => typeof value === "boolean",
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^true$|^false$/,
		resolve: (str) => str === "true",
		stringify: stringifyJSON
	},
	{
		identify: intIdentify$1,
		default: true,
		tag: "tag:yaml.org,2002:int",
		test: /^-?(?:0|[1-9][0-9]*)$/,
		resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
		stringify: ({ value }) => intIdentify$1(value) ? value.toString() : JSON.stringify(value)
	},
	{
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
		resolve: (str) => parseFloat(str),
		stringify: stringifyJSON
	}
];
var schema$2 = [map$1, seq$1].concat(jsonScalars, {
	default: true,
	tag: "",
	test: /^/,
	resolve(str, onError) {
		onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
		return str;
	}
});
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary$1 = {
	identify: (value) => value instanceof Uint8Array,
	default: false,
	tag: "tag:yaml.org,2002:binary",
	/**
	* Returns a Buffer in node and an Uint8Array in browsers
	*
	* To use the resulting buffer as an image, you'll want to do something like:
	*
	*   const blob = new Blob([buffer], { type: 'image/jpeg' })
	*   document.querySelector('#photo').src = URL.createObjectURL(blob)
	*/
	resolve(src, onError) {
		if (typeof atob === "function") {
			const str = atob(src.replace(/[\n\r]/g, ""));
			const buffer = new Uint8Array(str.length);
			for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);
			return buffer;
		} else {
			onError("This environment does not support reading binary tags; either Buffer or atob is required");
			return src;
		}
	},
	stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
		if (!value) return "";
		const buf = value;
		let str;
		if (typeof btoa === "function") {
			let s = "";
			for (let i = 0; i < buf.length; ++i) s += String.fromCharCode(buf[i]);
			str = btoa(s);
		} else throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
		type ?? (type = Scalar.BLOCK_LITERAL);
		if (type !== Scalar.QUOTE_DOUBLE) {
			const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
			const n = Math.ceil(str.length / lineWidth);
			const lines = new Array(n);
			for (let i = 0, o = 0; i < n; ++i, o += lineWidth) lines[i] = str.substr(o, lineWidth);
			str = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
		}
		return stringifyString({
			comment,
			type,
			value: str
		}, ctx, onComment, onChompKeep);
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq, onError) {
	if (isSeq(seq)) for (let i = 0; i < seq.items.length; ++i) {
		let item = seq.items[i];
		if (isPair(item)) continue;
		else if (isMap(item)) {
			if (item.items.length > 1) onError("Each pair must have its own sequence indicator");
			const pair = item.items[0] || new Pair(new Scalar(null));
			if (item.commentBefore) pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}\n${pair.key.commentBefore}` : item.commentBefore;
			if (item.comment) {
				const cn = pair.value ?? pair.key;
				cn.comment = cn.comment ? `${item.comment}\n${cn.comment}` : item.comment;
			}
			item = pair;
		}
		seq.items[i] = isPair(item) ? item : new Pair(item);
	}
	else onError("Expected a sequence for this tag");
	return seq;
}
function createPairs(schema, iterable, ctx) {
	const { replacer } = ctx;
	const pairs = new YAMLSeq(schema);
	pairs.tag = "tag:yaml.org,2002:pairs";
	let i = 0;
	if (iterable && Symbol.iterator in Object(iterable)) for (let it of iterable) {
		if (typeof replacer === "function") it = replacer.call(iterable, String(i++), it);
		let key, value;
		if (Array.isArray(it)) if (it.length === 2) {
			key = it[0];
			value = it[1];
		} else throw new TypeError(`Expected [key, value] tuple: ${it}`);
		else if (it && it instanceof Object) {
			const keys = Object.keys(it);
			if (keys.length === 1) {
				key = keys[0];
				value = it[key];
			} else throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
		} else key = it;
		pairs.items.push(createPair(key, value, ctx));
	}
	return pairs;
}
var pairs$1 = {
	collection: "seq",
	default: false,
	tag: "tag:yaml.org,2002:pairs",
	resolve: resolvePairs,
	createNode: createPairs
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class YAMLOMap extends YAMLSeq {
	constructor() {
		super();
		this.add = YAMLMap.prototype.add.bind(this);
		this.delete = YAMLMap.prototype.delete.bind(this);
		this.get = YAMLMap.prototype.get.bind(this);
		this.has = YAMLMap.prototype.has.bind(this);
		this.set = YAMLMap.prototype.set.bind(this);
		this.tag = YAMLOMap.tag;
	}
	/**
	* If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
	* but TypeScript won't allow widening the signature of a child method.
	*/
	toJSON(_, ctx) {
		if (!ctx) return super.toJSON(_);
		const map = /* @__PURE__ */ new Map();
		if (ctx?.onCreate) ctx.onCreate(map);
		for (const pair of this.items) {
			let key, value;
			if (isPair(pair)) {
				key = toJS(pair.key, "", ctx);
				value = toJS(pair.value, key, ctx);
			} else key = toJS(pair, "", ctx);
			if (map.has(key)) throw new Error("Ordered maps must not include duplicate keys");
			map.set(key, value);
		}
		return map;
	}
	static from(schema, iterable, ctx) {
		const pairs = createPairs(schema, iterable, ctx);
		const omap = new this();
		omap.items = pairs.items;
		return omap;
	}
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";
var omap$1 = {
	collection: "seq",
	identify: (value) => value instanceof Map,
	nodeClass: YAMLOMap,
	default: false,
	tag: "tag:yaml.org,2002:omap",
	resolve(seq, onError) {
		const pairs = resolvePairs(seq, onError);
		const seenKeys = [];
		for (const { key } of pairs.items) if (isScalar(key)) if (seenKeys.includes(key.value)) onError(`Ordered maps must not include duplicate keys: ${key.value}`);
		else seenKeys.push(key.value);
		return Object.assign(new YAMLOMap(), pairs);
	},
	createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
	if (source && (value ? trueTag : falseTag).test.test(source)) return source;
	return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag = {
	identify: (value) => value === true,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
	resolve: () => new Scalar(true),
	stringify: boolStringify
};
var falseTag = {
	identify: (value) => value === false,
	default: true,
	tag: "tag:yaml.org,2002:bool",
	test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
	resolve: () => new Scalar(false),
	stringify: boolStringify
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
	resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
	stringify: stringifyNumber
};
var floatExp = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "EXP",
	test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
	resolve: (str) => parseFloat(str.replace(/_/g, "")),
	stringify(node) {
		const num = Number(node.value);
		return isFinite(num) ? num.toExponential() : stringifyNumber(node);
	}
};
var float$1 = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
	resolve(str) {
		const node = new Scalar(parseFloat(str.replace(/_/g, "")));
		const dot = str.indexOf(".");
		if (dot !== -1) {
			const f = str.substring(dot + 1).replace(/_/g, "");
			if (f[f.length - 1] === "0") node.minFractionDigits = f.length;
		}
		return node;
	},
	stringify: stringifyNumber
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
function intResolve(str, offset, radix, { intAsBigInt }) {
	const sign = str[0];
	if (sign === "-" || sign === "+") offset += 1;
	str = str.substring(offset).replace(/_/g, "");
	if (intAsBigInt) {
		switch (radix) {
			case 2:
				str = `0b${str}`;
				break;
			case 8:
				str = `0o${str}`;
				break;
			case 16:
				str = `0x${str}`;
				break;
		}
		const n = BigInt(str);
		return sign === "-" ? BigInt(-1) * n : n;
	}
	const n = parseInt(str, radix);
	return sign === "-" ? -1 * n : n;
}
function intStringify(node, radix, prefix) {
	const { value } = node;
	if (intIdentify(value)) {
		const str = value.toString(radix);
		return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
	}
	return stringifyNumber(node);
}
var intBin = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "BIN",
	test: /^[-+]?0b[0-1_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
	stringify: (node) => intStringify(node, 2, "0b")
};
var intOct = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "OCT",
	test: /^[-+]?0[0-7_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
	stringify: (node) => intStringify(node, 8, "0")
};
var int$1 = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	test: /^[-+]?[0-9][0-9_]*$/,
	resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
	stringify: stringifyNumber
};
var intHex = {
	identify: intIdentify,
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "HEX",
	test: /^[-+]?0x[0-9a-fA-F_]+$/,
	resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
	stringify: (node) => intStringify(node, 16, "0x")
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class YAMLSet extends YAMLMap {
	constructor(schema) {
		super(schema);
		this.tag = YAMLSet.tag;
	}
	add(key) {
		let pair;
		if (isPair(key)) pair = key;
		else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null) pair = new Pair(key.key, null);
		else pair = new Pair(key, null);
		if (!findPair(this.items, pair.key)) this.items.push(pair);
	}
	/**
	* If `keepPair` is `true`, returns the Pair matching `key`.
	* Otherwise, returns the value of that Pair's key.
	*/
	get(key, keepPair) {
		const pair = findPair(this.items, key);
		return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
	}
	set(key, value) {
		if (typeof value !== "boolean") throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
		const prev = findPair(this.items, key);
		if (prev && !value) this.items.splice(this.items.indexOf(prev), 1);
		else if (!prev && value) this.items.push(new Pair(key));
	}
	toJSON(_, ctx) {
		return super.toJSON(_, ctx, Set);
	}
	toString(ctx, onComment, onChompKeep) {
		if (!ctx) return JSON.stringify(this);
		if (this.hasAllNullValues(true)) return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
		else throw new Error("Set items must all have null values");
	}
	static from(schema, iterable, ctx) {
		const { replacer } = ctx;
		const set = new this(schema);
		if (iterable && Symbol.iterator in Object(iterable)) for (let value of iterable) {
			if (typeof replacer === "function") value = replacer.call(iterable, value, value);
			set.items.push(createPair(value, null, ctx));
		}
		return set;
	}
};
YAMLSet.tag = "tag:yaml.org,2002:set";
var set$1 = {
	collection: "map",
	identify: (value) => value instanceof Set,
	nodeClass: YAMLSet,
	default: false,
	tag: "tag:yaml.org,2002:set",
	createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
	resolve(map, onError) {
		if (isMap(map)) if (map.hasAllNullValues(true)) return Object.assign(new YAMLSet(), map);
		else onError("Set items must all have null values");
		else onError("Expected a mapping for this tag");
		return map;
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
	const sign = str[0];
	const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
	const num = (n) => asBigInt ? BigInt(n) : Number(n);
	const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
	return sign === "-" ? num(-1) * res : res;
}
/**
* hhhh:mm:ss.sss
*
* Internal types handle bigint as number, because TS can't figure it out.
*/
function stringifySexagesimal(node) {
	let { value } = node;
	let num = (n) => n;
	if (typeof value === "bigint") num = (n) => BigInt(n);
	else if (isNaN(value) || !isFinite(value)) return stringifyNumber(node);
	let sign = "";
	if (value < 0) {
		sign = "-";
		value *= num(-1);
	}
	const _60 = num(60);
	const parts = [value % _60];
	if (value < 60) parts.unshift(0);
	else {
		value = (value - parts[0]) / _60;
		parts.unshift(value % _60);
		if (value >= 60) {
			value = (value - parts[0]) / _60;
			parts.unshift(value);
		}
	}
	return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime = {
	identify: (value) => typeof value === "bigint" || Number.isInteger(value),
	default: true,
	tag: "tag:yaml.org,2002:int",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
	resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
	stringify: stringifySexagesimal
};
var floatTime = {
	identify: (value) => typeof value === "number",
	default: true,
	tag: "tag:yaml.org,2002:float",
	format: "TIME",
	test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
	resolve: (str) => parseSexagesimal(str, false),
	stringify: stringifySexagesimal
};
var timestamp$1 = {
	identify: (value) => value instanceof Date,
	default: true,
	tag: "tag:yaml.org,2002:timestamp",
	test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
	resolve(str) {
		const match = str.match(timestamp$1.test);
		if (!match) throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
		const [, year, month, day, hour, minute, second] = match.map(Number);
		const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
		let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
		const tz = match[8];
		if (tz && tz !== "Z") {
			let d = parseSexagesimal(tz, false);
			if (Math.abs(d) < 30) d *= 60;
			date -= 6e4 * d;
		}
		return new Date(date);
	},
	stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema$1 = [
	map$1,
	seq$1,
	string,
	nullTag,
	trueTag,
	falseTag,
	intBin,
	intOct,
	int$1,
	intHex,
	floatNaN,
	floatExp,
	float$1,
	binary$1,
	merge$2,
	omap$1,
	pairs$1,
	set$1,
	intTime,
	floatTime,
	timestamp$1
];
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/tags.js
var schemas = new Map([
	["core", schema$3],
	["failsafe", [
		map$1,
		seq$1,
		string
	]],
	["json", schema$2],
	["yaml11", schema$1],
	["yaml-1.1", schema$1]
]);
var tagsByName = {
	binary: binary$1,
	bool: boolTag,
	float: float$2,
	floatExp: floatExp$1,
	floatNaN: floatNaN$1,
	floatTime,
	int: int$2,
	intHex: intHex$1,
	intOct: intOct$1,
	intTime,
	map: map$1,
	merge: merge$2,
	null: nullTag,
	omap: omap$1,
	pairs: pairs$1,
	seq: seq$1,
	set: set$1,
	timestamp: timestamp$1
};
var coreKnownTags = {
	"tag:yaml.org,2002:binary": binary$1,
	"tag:yaml.org,2002:merge": merge$2,
	"tag:yaml.org,2002:omap": omap$1,
	"tag:yaml.org,2002:pairs": pairs$1,
	"tag:yaml.org,2002:set": set$1,
	"tag:yaml.org,2002:timestamp": timestamp$1
};
function getTags(customTags, schemaName, addMergeTag) {
	const schemaTags = schemas.get(schemaName);
	if (schemaTags && !customTags) return addMergeTag && !schemaTags.includes(merge$2) ? schemaTags.concat(merge$2) : schemaTags.slice();
	let tags = schemaTags;
	if (!tags) if (Array.isArray(customTags)) tags = [];
	else {
		const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
		throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
	}
	if (Array.isArray(customTags)) for (const tag of customTags) tags = tags.concat(tag);
	else if (typeof customTags === "function") tags = customTags(tags.slice());
	if (addMergeTag) tags = tags.concat(merge$2);
	return tags.reduce((tags, tag) => {
		const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
		if (!tagObj) {
			const tagName = JSON.stringify(tag);
			const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
			throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
		}
		if (!tags.includes(tagObj)) tags.push(tagObj);
		return tags;
	}, []);
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
var Schema$2 = class Schema$2 {
	constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
		this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
		this.name = typeof schema === "string" && schema || "core";
		this.knownTags = resolveKnownTags ? coreKnownTags : {};
		this.tags = getTags(customTags, this.name, merge);
		this.toStringOptions = toStringDefaults ?? null;
		Object.defineProperty(this, MAP, { value: map$1 });
		Object.defineProperty(this, SCALAR$1, { value: string });
		Object.defineProperty(this, SEQ, { value: seq$1 });
		this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
	}
	clone() {
		const copy = Object.create(Schema$2.prototype, Object.getOwnPropertyDescriptors(this));
		copy.tags = this.tags.slice();
		return copy;
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
	const lines = [];
	let hasDirectives = options.directives === true;
	if (options.directives !== false && doc.directives) {
		const dir = doc.directives.toString(doc);
		if (dir) {
			lines.push(dir);
			hasDirectives = true;
		} else if (doc.directives.docStart) hasDirectives = true;
	}
	if (hasDirectives) lines.push("---");
	const ctx = createStringifyContext(doc, options);
	const { commentString } = ctx.options;
	if (doc.commentBefore) {
		if (lines.length !== 1) lines.unshift("");
		const cs = commentString(doc.commentBefore);
		lines.unshift(indentComment(cs, ""));
	}
	let chompKeep = false;
	let contentComment = null;
	if (doc.contents) {
		if (isNode(doc.contents)) {
			if (doc.contents.spaceBefore && hasDirectives) lines.push("");
			if (doc.contents.commentBefore) {
				const cs = commentString(doc.contents.commentBefore);
				lines.push(indentComment(cs, ""));
			}
			ctx.forceBlockIndent = !!doc.comment;
			contentComment = doc.contents.comment;
		}
		const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
		let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
		if (contentComment) body += lineComment(body, "", commentString(contentComment));
		if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") lines[lines.length - 1] = `--- ${body}`;
		else lines.push(body);
	} else lines.push(stringify(doc.contents, ctx));
	if (doc.directives?.docEnd) if (doc.comment) {
		const cs = commentString(doc.comment);
		if (cs.includes("\n")) {
			lines.push("...");
			lines.push(indentComment(cs, ""));
		} else lines.push(`... ${cs}`);
	} else lines.push("...");
	else {
		let dc = doc.comment;
		if (dc && chompKeep) dc = dc.replace(/^\n+/, "");
		if (dc) {
			if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "") lines.push("");
			lines.push(indentComment(commentString(dc), ""));
		}
	}
	return lines.join("\n") + "\n";
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/doc/Document.js
var Document = class Document {
	constructor(value, replacer, options) {
		/** A comment before this Document */
		this.commentBefore = null;
		/** A comment immediately after this Document */
		this.comment = null;
		/** Errors encountered during parsing. */
		this.errors = [];
		/** Warnings encountered during parsing. */
		this.warnings = [];
		Object.defineProperty(this, NODE_TYPE, { value: DOC });
		let _replacer = null;
		if (typeof replacer === "function" || Array.isArray(replacer)) _replacer = replacer;
		else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const opt = Object.assign({
			intAsBigInt: false,
			keepSourceTokens: false,
			logLevel: "warn",
			prettyErrors: true,
			strict: true,
			stringKeys: false,
			uniqueKeys: true,
			version: "1.2"
		}, options);
		this.options = opt;
		let { version } = opt;
		if (options?._directives) {
			this.directives = options._directives.atDocument();
			if (this.directives.yaml.explicit) version = this.directives.yaml.version;
		} else this.directives = new Directives({ version });
		this.setSchema(version, options);
		this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
	}
	/**
	* Create a deep copy of this Document and its contents.
	*
	* Custom Node values that inherit from `Object` still refer to their original instances.
	*/
	clone() {
		const copy = Object.create(Document.prototype, { [NODE_TYPE]: { value: DOC } });
		copy.commentBefore = this.commentBefore;
		copy.comment = this.comment;
		copy.errors = this.errors.slice();
		copy.warnings = this.warnings.slice();
		copy.options = Object.assign({}, this.options);
		if (this.directives) copy.directives = this.directives.clone();
		copy.schema = this.schema.clone();
		copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
		if (this.range) copy.range = this.range.slice();
		return copy;
	}
	/** Adds a value to the document. */
	add(value) {
		if (assertCollection(this.contents)) this.contents.add(value);
	}
	/** Adds a value to the document. */
	addIn(path, value) {
		if (assertCollection(this.contents)) this.contents.addIn(path, value);
	}
	/**
	* Create a new `Alias` node, ensuring that the target `node` has the required anchor.
	*
	* If `node` already has an anchor, `name` is ignored.
	* Otherwise, the `node.anchor` value will be set to `name`,
	* or if an anchor with that name is already present in the document,
	* `name` will be used as a prefix for a new unique anchor.
	* If `name` is undefined, the generated anchor will use 'a' as a prefix.
	*/
	createAlias(node, name) {
		if (!node.anchor) {
			const prev = anchorNames(this);
			node.anchor = !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
		}
		return new Alias(node.anchor);
	}
	createNode(value, replacer, options) {
		let _replacer = void 0;
		if (typeof replacer === "function") {
			value = replacer.call({ "": value }, "", value);
			_replacer = replacer;
		} else if (Array.isArray(replacer)) {
			const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
			const asStr = replacer.filter(keyToStr).map(String);
			if (asStr.length > 0) replacer = replacer.concat(asStr);
			_replacer = replacer;
		} else if (options === void 0 && replacer) {
			options = replacer;
			replacer = void 0;
		}
		const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
		const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(this, anchorPrefix || "a");
		const ctx = {
			aliasDuplicateObjects: aliasDuplicateObjects ?? true,
			keepUndefined: keepUndefined ?? false,
			onAnchor,
			onTagObj,
			replacer: _replacer,
			schema: this.schema,
			sourceObjects
		};
		const node = createNode(value, tag, ctx);
		if (flow && isCollection(node)) node.flow = true;
		setAnchors();
		return node;
	}
	/**
	* Convert a key and a value into a `Pair` using the current schema,
	* recursively wrapping all values as `Scalar` or `Collection` nodes.
	*/
	createPair(key, value, options = {}) {
		return new Pair(this.createNode(key, null, options), this.createNode(value, null, options));
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	delete(key) {
		return assertCollection(this.contents) ? this.contents.delete(key) : false;
	}
	/**
	* Removes a value from the document.
	* @returns `true` if the item was found and removed.
	*/
	deleteIn(path) {
		if (isEmptyPath(path)) {
			if (this.contents == null) return false;
			this.contents = null;
			return true;
		}
		return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
	}
	/**
	* Returns item at `key`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	get(key, keepScalar) {
		return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
	}
	/**
	* Returns item at `path`, or `undefined` if not found. By default unwraps
	* scalar values from their surrounding node; to disable set `keepScalar` to
	* `true` (collections are always returned intact).
	*/
	getIn(path, keepScalar) {
		if (isEmptyPath(path)) return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
		return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
	}
	/**
	* Checks if the document includes a value with the key `key`.
	*/
	has(key) {
		return isCollection(this.contents) ? this.contents.has(key) : false;
	}
	/**
	* Checks if the document includes a value at `path`.
	*/
	hasIn(path) {
		if (isEmptyPath(path)) return this.contents !== void 0;
		return isCollection(this.contents) ? this.contents.hasIn(path) : false;
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	set(key, value) {
		if (this.contents == null) this.contents = collectionFromPath(this.schema, [key], value);
		else if (assertCollection(this.contents)) this.contents.set(key, value);
	}
	/**
	* Sets a value in this document. For `!!set`, `value` needs to be a
	* boolean to add/remove the item from the set.
	*/
	setIn(path, value) {
		if (isEmptyPath(path)) this.contents = value;
		else if (this.contents == null) this.contents = collectionFromPath(this.schema, Array.from(path), value);
		else if (assertCollection(this.contents)) this.contents.setIn(path, value);
	}
	/**
	* Change the YAML version and schema used by the document.
	* A `null` version disables support for directives, explicit tags, anchors, and aliases.
	* It also requires the `schema` option to be given as a `Schema` instance value.
	*
	* Overrides all previously set schema options.
	*/
	setSchema(version, options = {}) {
		if (typeof version === "number") version = String(version);
		let opt;
		switch (version) {
			case "1.1":
				if (this.directives) this.directives.yaml.version = "1.1";
				else this.directives = new Directives({ version: "1.1" });
				opt = {
					resolveKnownTags: false,
					schema: "yaml-1.1"
				};
				break;
			case "1.2":
			case "next":
				if (this.directives) this.directives.yaml.version = version;
				else this.directives = new Directives({ version });
				opt = {
					resolveKnownTags: true,
					schema: "core"
				};
				break;
			case null:
				if (this.directives) delete this.directives;
				opt = null;
				break;
			default: {
				const sv = JSON.stringify(version);
				throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
			}
		}
		if (options.schema instanceof Object) this.schema = options.schema;
		else if (opt) this.schema = new Schema$2(Object.assign(opt, options));
		else throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
	}
	toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
		const ctx = {
			anchors: /* @__PURE__ */ new Map(),
			doc: this,
			keep: !json,
			mapAsMap: mapAsMap === true,
			mapKeyWarned: false,
			maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
		};
		const res = toJS(this.contents, jsonArg ?? "", ctx);
		if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
		return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
	}
	/**
	* A JSON representation of the document `contents`.
	*
	* @param jsonArg Used by `JSON.stringify` to indicate the array index or
	*   property name.
	*/
	toJSON(jsonArg, onAnchor) {
		return this.toJS({
			json: true,
			jsonArg,
			mapAsMap: false,
			onAnchor
		});
	}
	/** A YAML representation of the document. */
	toString(options = {}) {
		if (this.errors.length > 0) throw new Error("Document with errors cannot be stringified");
		if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
			const s = JSON.stringify(options.indent);
			throw new Error(`"indent" option must be a positive integer, not ${s}`);
		}
		return stringifyDocument(this, options);
	}
};
function assertCollection(contents) {
	if (isCollection(contents)) return true;
	throw new Error("Expected a YAML collection as document contents");
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/errors.js
var YAMLError = class extends Error {
	constructor(name, pos, code, message) {
		super();
		this.name = name;
		this.code = code;
		this.message = message;
		this.pos = pos;
	}
};
var YAMLParseError = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLParseError", pos, code, message);
	}
};
var YAMLWarning = class extends YAMLError {
	constructor(pos, code, message) {
		super("YAMLWarning", pos, code, message);
	}
};
var prettifyError = (src, lc) => (error) => {
	if (error.pos[0] === -1) return;
	error.linePos = error.pos.map((pos) => lc.linePos(pos));
	const { line, col } = error.linePos[0];
	error.message += ` at line ${line}, column ${col}`;
	let ci = col - 1;
	let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
	if (ci >= 60 && lineStr.length > 80) {
		const trimStart = Math.min(ci - 39, lineStr.length - 79);
		lineStr = "…" + lineStr.substring(trimStart);
		ci -= trimStart - 1;
	}
	if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + "…";
	if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
		let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
		if (prev.length > 80) prev = prev.substring(0, 79) + "…\n";
		lineStr = prev + lineStr;
	}
	if (/[^ ]/.test(lineStr)) {
		let count = 1;
		const end = error.linePos[1];
		if (end?.line === line && end.col > col) count = Math.max(1, Math.min(end.col - col, 80 - ci));
		const pointer = " ".repeat(ci) + "^".repeat(count);
		error.message += `:\n\n${lineStr}\n${pointer}\n`;
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
	let spaceBefore = false;
	let atNewline = startOnNewline;
	let hasSpace = startOnNewline;
	let comment = "";
	let commentSep = "";
	let hasNewline = false;
	let reqSpace = false;
	let tab = null;
	let anchor = null;
	let tag = null;
	let newlineAfterProp = null;
	let comma = null;
	let found = null;
	let start = null;
	for (const token of tokens) {
		if (reqSpace) {
			if (token.type !== "space" && token.type !== "newline" && token.type !== "comma") onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
			reqSpace = false;
		}
		if (tab) {
			if (atNewline && token.type !== "comment" && token.type !== "newline") onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
			tab = null;
		}
		switch (token.type) {
			case "space":
				if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) tab = token;
				hasSpace = true;
				break;
			case "comment": {
				if (!hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				const cb = token.source.substring(1) || " ";
				if (!comment) comment = cb;
				else comment += commentSep + cb;
				commentSep = "";
				atNewline = false;
				break;
			}
			case "newline":
				if (atNewline) {
					if (comment) comment += token.source;
					else if (!found || indicator !== "seq-item-ind") spaceBefore = true;
				} else commentSep += token.source;
				atNewline = true;
				hasNewline = true;
				if (anchor || tag) newlineAfterProp = token;
				hasSpace = true;
				break;
			case "anchor":
				if (anchor) onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
				if (token.source.endsWith(":")) onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
				anchor = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case "tag":
				if (tag) onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
				tag = token;
				start ?? (start = token.offset);
				atNewline = false;
				hasSpace = false;
				reqSpace = true;
				break;
			case indicator:
				if (anchor || tag) onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
				if (found) onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
				found = token;
				atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
				hasSpace = false;
				break;
			case "comma": if (flow) {
				if (comma) onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
				comma = token;
				atNewline = false;
				hasSpace = false;
				break;
			}
			default:
				onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
				atNewline = false;
				hasSpace = false;
		}
	}
	const last = tokens[tokens.length - 1];
	const end = last ? last.offset + last.source.length : offset;
	if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
	if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq")) onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
	return {
		comma,
		found,
		spaceBefore,
		comment,
		hasNewline,
		anchor,
		tag,
		newlineAfterProp,
		end,
		start: start ?? end
	};
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key) {
	if (!key) return null;
	switch (key.type) {
		case "alias":
		case "scalar":
		case "double-quoted-scalar":
		case "single-quoted-scalar":
			if (key.source.includes("\n")) return true;
			if (key.end) {
				for (const st of key.end) if (st.type === "newline") return true;
			}
			return false;
		case "flow-collection":
			for (const it of key.items) {
				for (const st of it.start) if (st.type === "newline") return true;
				if (it.sep) {
					for (const st of it.sep) if (st.type === "newline") return true;
				}
				if (containsNewline(it.key) || containsNewline(it.value)) return true;
			}
			return false;
		default: return true;
	}
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
	if (fc?.type === "flow-collection") {
		const end = fc.end[0];
		if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) onError(end, "BAD_INDENT", "Flow end indicator should be more indented than parent", true);
	}
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search) {
	const { uniqueKeys } = ctx.options;
	if (uniqueKeys === false) return false;
	const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
	return items.some((pair) => isEqual(pair.key, search));
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-block-map.js
var startColMsg = "All mapping items must start at the same column";
function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
	const map = new (tag?.nodeClass ?? YAMLMap)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	let offset = bm.offset;
	let commentEnd = null;
	for (const collItem of bm.items) {
		const { start, key, sep, value } = collItem;
		const keyProps = resolveProps(start, {
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: bm.indent,
			startOnNewline: true
		});
		const implicitKey = !keyProps.found;
		if (implicitKey) {
			if (key) {
				if (key.type === "block-seq") onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
				else if ("indent" in key && key.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
			}
			if (!keyProps.anchor && !keyProps.tag && !sep) {
				commentEnd = keyProps.end;
				if (keyProps.comment) if (map.comment) map.comment += "\n" + keyProps.comment;
				else map.comment = keyProps.comment;
				continue;
			}
			if (keyProps.newlineAfterProp || containsNewline(key)) onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
		} else if (keyProps.found?.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
		ctx.atKey = true;
		const keyStart = keyProps.end;
		const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
		if (ctx.schema.compat) flowIndentCheck(bm.indent, key, onError);
		ctx.atKey = false;
		if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
		const valueProps = resolveProps(sep ?? [], {
			indicator: "map-value-ind",
			next: value,
			offset: keyNode.range[2],
			onError,
			parentIndent: bm.indent,
			startOnNewline: !key || key.type === "block-scalar"
		});
		offset = valueProps.end;
		if (valueProps.found) {
			if (implicitKey) {
				if (value?.type === "block-map" && !valueProps.hasNewline) onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
				if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024) onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
			}
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
			if (ctx.schema.compat) flowIndentCheck(bm.indent, value, onError);
			offset = valueNode.range[2];
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		} else {
			if (implicitKey) onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
			if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
			else keyNode.comment = valueProps.comment;
			const pair = new Pair(keyNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			map.items.push(pair);
		}
	}
	if (commentEnd && commentEnd < offset) onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
	map.range = [
		bm.offset,
		offset,
		commentEnd ?? offset
	];
	return map;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
	const seq = new (tag?.nodeClass ?? YAMLSeq)(ctx.schema);
	if (ctx.atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = bs.offset;
	let commentEnd = null;
	for (const { start, value } of bs.items) {
		const props = resolveProps(start, {
			indicator: "seq-item-ind",
			next: value,
			offset,
			onError,
			parentIndent: bs.indent,
			startOnNewline: true
		});
		if (!props.found) if (props.anchor || props.tag || value) if (value?.type === "block-seq") onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
		else onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
		else {
			commentEnd = props.end;
			if (props.comment) seq.comment = props.comment;
			continue;
		}
		const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
		if (ctx.schema.compat) flowIndentCheck(bs.indent, value, onError);
		offset = node.range[2];
		seq.items.push(node);
	}
	seq.range = [
		bs.offset,
		offset,
		commentEnd ?? offset
	];
	return seq;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
	let comment = "";
	if (end) {
		let hasSpace = false;
		let sep = "";
		for (const token of end) {
			const { source, type } = token;
			switch (type) {
				case "space":
					hasSpace = true;
					break;
				case "comment": {
					if (reqSpace && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
					const cb = source.substring(1) || " ";
					if (!comment) comment = cb;
					else comment += sep + cb;
					sep = "";
					break;
				}
				case "newline":
					if (comment) sep += source;
					hasSpace = true;
					break;
				default: onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
			}
			offset += source.length;
		}
	}
	return {
		comment,
		offset
	};
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
var blockMsg = "Block collections are not allowed within flow collections";
var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
	const isMap = fc.start.source === "{";
	const fcName = isMap ? "flow map" : "flow sequence";
	const coll = new (tag?.nodeClass ?? (isMap ? YAMLMap : YAMLSeq))(ctx.schema);
	coll.flow = true;
	const atRoot = ctx.atRoot;
	if (atRoot) ctx.atRoot = false;
	if (ctx.atKey) ctx.atKey = false;
	let offset = fc.offset + fc.start.source.length;
	for (let i = 0; i < fc.items.length; ++i) {
		const collItem = fc.items[i];
		const { start, key, sep, value } = collItem;
		const props = resolveProps(start, {
			flow: fcName,
			indicator: "explicit-key-ind",
			next: key ?? sep?.[0],
			offset,
			onError,
			parentIndent: fc.indent,
			startOnNewline: false
		});
		if (!props.found) {
			if (!props.anchor && !props.tag && !sep && !value) {
				if (i === 0 && props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
				else if (i < fc.items.length - 1) onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
				if (props.comment) if (coll.comment) coll.comment += "\n" + props.comment;
				else coll.comment = props.comment;
				offset = props.end;
				continue;
			}
			if (!isMap && ctx.options.strict && containsNewline(key)) onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
		}
		if (i === 0) {
			if (props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
		} else {
			if (!props.comma) onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
			if (props.comment) {
				let prevItemComment = "";
				loop: for (const st of start) switch (st.type) {
					case "comma":
					case "space": break;
					case "comment":
						prevItemComment = st.source.substring(1);
						break loop;
					default: break loop;
				}
				if (prevItemComment) {
					let prev = coll.items[coll.items.length - 1];
					if (isPair(prev)) prev = prev.value ?? prev.key;
					if (prev.comment) prev.comment += "\n" + prevItemComment;
					else prev.comment = prevItemComment;
					props.comment = props.comment.substring(prevItemComment.length + 1);
				}
			}
		}
		if (!isMap && !sep && !props.found) {
			const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
			coll.items.push(valueNode);
			offset = valueNode.range[2];
			if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
		} else {
			ctx.atKey = true;
			const keyStart = props.end;
			const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
			if (isBlock(key)) onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
			ctx.atKey = false;
			const valueProps = resolveProps(sep ?? [], {
				flow: fcName,
				indicator: "map-value-ind",
				next: value,
				offset: keyNode.range[2],
				onError,
				parentIndent: fc.indent,
				startOnNewline: false
			});
			if (valueProps.found) {
				if (!isMap && !props.found && ctx.options.strict) {
					if (sep) for (const st of sep) {
						if (st === valueProps.found) break;
						if (st.type === "newline") {
							onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
							break;
						}
					}
					if (props.start < valueProps.found.offset - 1024) onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
				}
			} else if (value) if ("source" in value && value.source?.[0] === ":") onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
			else onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
			const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
			if (valueNode) {
				if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
			} else if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
			else keyNode.comment = valueProps.comment;
			const pair = new Pair(keyNode, valueNode);
			if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
			if (isMap) {
				const map = coll;
				if (mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
				map.items.push(pair);
			} else {
				const map = new YAMLMap(ctx.schema);
				map.flow = true;
				map.items.push(pair);
				const endRange = (valueNode ?? keyNode).range;
				map.range = [
					keyNode.range[0],
					endRange[1],
					endRange[2]
				];
				coll.items.push(map);
			}
			offset = valueNode ? valueNode.range[2] : valueProps.end;
		}
	}
	const expectedEnd = isMap ? "}" : "]";
	const [ce, ...ee] = fc.end;
	let cePos = offset;
	if (ce?.source === expectedEnd) cePos = ce.offset + ce.source.length;
	else {
		const name = fcName[0].toUpperCase() + fcName.substring(1);
		const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
		onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
		if (ce && ce.source.length !== 1) ee.unshift(ce);
	}
	if (ee.length > 0) {
		const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
		if (end.comment) if (coll.comment) coll.comment += "\n" + end.comment;
		else coll.comment = end.comment;
		coll.range = [
			fc.offset,
			cePos,
			end.offset
		];
	} else coll.range = [
		fc.offset,
		cePos,
		cePos
	];
	return coll;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN, ctx, token, onError, tagName, tag) {
	const coll = token.type === "block-map" ? resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection(CN, ctx, token, onError, tag);
	const Coll = coll.constructor;
	if (tagName === "!" || tagName === Coll.tagName) {
		coll.tag = Coll.tagName;
		return coll;
	}
	if (tagName) coll.tag = tagName;
	return coll;
}
function composeCollection(CN, ctx, token, props, onError) {
	const tagToken = props.tag;
	const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
	if (token.type === "block-seq") {
		const { anchor, newlineAfterProp: nl } = props;
		const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
		if (lastProp && (!nl || nl.offset < lastProp.offset)) onError(lastProp, "MISSING_CHAR", "Missing newline after block sequence props");
	}
	const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
	if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") return resolveCollection(CN, ctx, token, onError, tagName);
	let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
	if (!tag) {
		const kt = ctx.schema.knownTags[tagName];
		if (kt?.collection === expType) {
			ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
			tag = kt;
		} else {
			if (kt) onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
			else onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
			return resolveCollection(CN, ctx, token, onError, tagName);
		}
	}
	const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
	const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
	const node = isNode(res) ? res : new Scalar(res);
	node.range = coll.range;
	node.tag = tagName;
	if (tag?.format) node.format = tag.format;
	return node;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar, onError) {
	const start = scalar.offset;
	const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
	if (!header) return {
		value: "",
		type: null,
		comment: "",
		range: [
			start,
			start,
			start
		]
	};
	const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
	const lines = scalar.source ? splitLines(scalar.source) : [];
	let chompStart = lines.length;
	for (let i = lines.length - 1; i >= 0; --i) {
		const content = lines[i][1];
		if (content === "" || content === "\r") chompStart = i;
		else break;
	}
	if (chompStart === 0) {
		const value = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
		let end = start + header.length;
		if (scalar.source) end += scalar.source.length;
		return {
			value,
			type,
			comment: header.comment,
			range: [
				start,
				end,
				end
			]
		};
	}
	let trimIndent = scalar.indent + header.indent;
	let offset = scalar.offset + header.length;
	let contentStart = 0;
	for (let i = 0; i < chompStart; ++i) {
		const [indent, content] = lines[i];
		if (content === "" || content === "\r") {
			if (header.indent === 0 && indent.length > trimIndent) trimIndent = indent.length;
		} else {
			if (indent.length < trimIndent) onError(offset + indent.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator");
			if (header.indent === 0) trimIndent = indent.length;
			contentStart = i;
			if (trimIndent === 0 && !ctx.atRoot) onError(offset, "BAD_INDENT", "Block scalar values in collections must be indented");
			break;
		}
		offset += indent.length + content.length + 1;
	}
	for (let i = lines.length - 1; i >= chompStart; --i) if (lines[i][0].length > trimIndent) chompStart = i + 1;
	let value = "";
	let sep = "";
	let prevMoreIndented = false;
	for (let i = 0; i < contentStart; ++i) value += lines[i][0].slice(trimIndent) + "\n";
	for (let i = contentStart; i < chompStart; ++i) {
		let [indent, content] = lines[i];
		offset += indent.length + content.length + 1;
		const crlf = content[content.length - 1] === "\r";
		if (crlf) content = content.slice(0, -1);
		/* istanbul ignore if already caught in lexer */
		if (content && indent.length < trimIndent) {
			const message = `Block scalar lines must not be less indented than their ${header.indent ? "explicit indentation indicator" : "first line"}`;
			onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
			indent = "";
		}
		if (type === Scalar.BLOCK_LITERAL) {
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
		} else if (indent.length > trimIndent || content[0] === "	") {
			if (sep === " ") sep = "\n";
			else if (!prevMoreIndented && sep === "\n") sep = "\n\n";
			value += sep + indent.slice(trimIndent) + content;
			sep = "\n";
			prevMoreIndented = true;
		} else if (content === "") if (sep === "\n") value += "\n";
		else sep = "\n";
		else {
			value += sep + content;
			sep = " ";
			prevMoreIndented = false;
		}
	}
	switch (header.chomp) {
		case "-": break;
		case "+":
			for (let i = chompStart; i < lines.length; ++i) value += "\n" + lines[i][0].slice(trimIndent);
			if (value[value.length - 1] !== "\n") value += "\n";
			break;
		default: value += "\n";
	}
	const end = start + header.length + scalar.source.length;
	return {
		value,
		type,
		comment: header.comment,
		range: [
			start,
			end,
			end
		]
	};
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
	/* istanbul ignore if should not happen */
	if (props[0].type !== "block-scalar-header") {
		onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
		return null;
	}
	const { source } = props[0];
	const mode = source[0];
	let indent = 0;
	let chomp = "";
	let error = -1;
	for (let i = 1; i < source.length; ++i) {
		const ch = source[i];
		if (!chomp && (ch === "-" || ch === "+")) chomp = ch;
		else {
			const n = Number(ch);
			if (!indent && n) indent = n;
			else if (error === -1) error = offset + i;
		}
	}
	if (error !== -1) onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
	let hasSpace = false;
	let comment = "";
	let length = source.length;
	for (let i = 1; i < props.length; ++i) {
		const token = props[i];
		switch (token.type) {
			case "space": hasSpace = true;
			case "newline":
				length += token.source.length;
				break;
			case "comment":
				if (strict && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
				length += token.source.length;
				comment = token.source.substring(1);
				break;
			case "error":
				onError(token, "UNEXPECTED_TOKEN", token.message);
				length += token.source.length;
				break;
			/* istanbul ignore next should not happen */
			default: {
				onError(token, "UNEXPECTED_TOKEN", `Unexpected token in block scalar header: ${token.type}`);
				const ts = token.source;
				if (ts && typeof ts === "string") length += ts.length;
			}
		}
	}
	return {
		mode,
		indent,
		chomp,
		comment,
		length
	};
}
/** @returns Array of lines split up as `[indent, content]` */
function splitLines(source) {
	const split = source.split(/\n( *)/);
	const first = split[0];
	const m = first.match(/^( *)/);
	const lines = [m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first]];
	for (let i = 1; i < split.length; i += 2) lines.push([split[i], split[i + 1]]);
	return lines;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar, strict, onError) {
	const { offset, type, source, end } = scalar;
	let _type;
	let value;
	const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
	switch (type) {
		case "scalar":
			_type = Scalar.PLAIN;
			value = plainValue(source, _onError);
			break;
		case "single-quoted-scalar":
			_type = Scalar.QUOTE_SINGLE;
			value = singleQuotedValue(source, _onError);
			break;
		case "double-quoted-scalar":
			_type = Scalar.QUOTE_DOUBLE;
			value = doubleQuotedValue(source, _onError);
			break;
		/* istanbul ignore next should not happen */
		default:
			onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
			return {
				value: "",
				type: null,
				comment: "",
				range: [
					offset,
					offset + source.length,
					offset + source.length
				]
			};
	}
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, strict, onError);
	return {
		value,
		type: _type,
		comment: re.comment,
		range: [
			offset,
			valueEnd,
			re.offset
		]
	};
}
function plainValue(source, onError) {
	let badChar = "";
	switch (source[0]) {
		/* istanbul ignore next should not happen */
		case "	":
			badChar = "a tab character";
			break;
		case ",":
			badChar = "flow indicator character ,";
			break;
		case "%":
			badChar = "directive indicator character %";
			break;
		case "|":
		case ">":
			badChar = `block scalar indicator ${source[0]}`;
			break;
		case "@":
		case "`":
			badChar = `reserved character ${source[0]}`;
			break;
	}
	if (badChar) onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
	return foldLines(source);
}
function singleQuotedValue(source, onError) {
	if (source[source.length - 1] !== "'" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
	return foldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function foldLines(source) {
	/**
	* The negative lookbehind here and in the `re` RegExp is to
	* prevent causing a polynomial search time in certain cases.
	*
	* The try-catch is for Safari, which doesn't support this yet:
	* https://caniuse.com/js-regexp-lookbehind
	*/
	let first, line;
	try {
		first = /* @__PURE__ */ new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
		line = /* @__PURE__ */ new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
	} catch {
		first = /(.*?)[ \t]*\r?\n/sy;
		line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
	}
	let match = first.exec(source);
	if (!match) return source;
	let res = match[1];
	let sep = " ";
	let pos = first.lastIndex;
	line.lastIndex = pos;
	while (match = line.exec(source)) {
		if (match[1] === "") if (sep === "\n") res += sep;
		else sep = "\n";
		else {
			res += sep + match[1];
			sep = " ";
		}
		pos = line.lastIndex;
	}
	const last = /[ \t]*(.*)/sy;
	last.lastIndex = pos;
	match = last.exec(source);
	return res + sep + (match?.[1] ?? "");
}
function doubleQuotedValue(source, onError) {
	let res = "";
	for (let i = 1; i < source.length - 1; ++i) {
		const ch = source[i];
		if (ch === "\r" && source[i + 1] === "\n") continue;
		if (ch === "\n") {
			const { fold, offset } = foldNewline(source, i);
			res += fold;
			i = offset;
		} else if (ch === "\\") {
			let next = source[++i];
			const cc = escapeCodes[next];
			if (cc) res += cc;
			else if (next === "\n") {
				next = source[i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "\r" && source[i + 1] === "\n") {
				next = source[++i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
			} else if (next === "x" || next === "u" || next === "U") {
				const length = next === "x" ? 2 : next === "u" ? 4 : 8;
				res += parseCharCode(source, i + 1, length, onError);
				i += length;
			} else {
				const raw = source.substr(i - 1, 2);
				onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
				res += raw;
			}
		} else if (ch === " " || ch === "	") {
			const wsStart = i;
			let next = source[i + 1];
			while (next === " " || next === "	") next = source[++i + 1];
			if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n")) res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
		} else res += ch;
	}
	if (source[source.length - 1] !== "\"" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing \"quote");
	return res;
}
/**
* Fold a single newline into a space, multiple newlines to N - 1 newlines.
* Presumes `source[offset] === '\n'`
*/
function foldNewline(source, offset) {
	let fold = "";
	let ch = source[offset + 1];
	while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
		if (ch === "\r" && source[offset + 2] !== "\n") break;
		if (ch === "\n") fold += "\n";
		offset += 1;
		ch = source[offset + 1];
	}
	if (!fold) fold = " ";
	return {
		fold,
		offset
	};
}
var escapeCodes = {
	"0": "\0",
	a: "\x07",
	b: "\b",
	e: "\x1B",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	",
	v: "\v",
	N: "",
	_: "\xA0",
	L: "\u2028",
	P: "\u2029",
	" ": " ",
	"\"": "\"",
	"/": "/",
	"\\": "\\",
	"	": "	"
};
function parseCharCode(source, offset, length, onError) {
	const cc = source.substr(offset, length);
	const code = cc.length === length && /^[0-9a-fA-F]+$/.test(cc) ? parseInt(cc, 16) : NaN;
	try {
		return String.fromCodePoint(code);
	} catch {
		const raw = source.substr(offset - 2, length + 2);
		onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
		return raw;
	}
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
	const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
	const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
	let tag;
	if (ctx.options.stringKeys && ctx.atKey) tag = ctx.schema[SCALAR$1];
	else if (tagName) tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
	else if (token.type === "scalar") tag = findScalarTagByTest(ctx, value, token, onError);
	else tag = ctx.schema[SCALAR$1];
	let scalar;
	try {
		const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
		scalar = isScalar(res) ? res : new Scalar(res);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
		scalar = new Scalar(value);
	}
	scalar.range = range;
	scalar.source = value;
	if (type) scalar.type = type;
	if (tagName) scalar.tag = tagName;
	if (tag.format) scalar.format = tag.format;
	if (comment) scalar.comment = comment;
	return scalar;
}
function findScalarTagByName(schema, value, tagName, tagToken, onError) {
	if (tagName === "!") return schema[SCALAR$1];
	const matchWithTest = [];
	for (const tag of schema.tags) if (!tag.collection && tag.tag === tagName) if (tag.default && tag.test) matchWithTest.push(tag);
	else return tag;
	for (const tag of matchWithTest) if (tag.test?.test(value)) return tag;
	const kt = schema.knownTags[tagName];
	if (kt && !kt.collection) {
		schema.tags.push(Object.assign({}, kt, {
			default: false,
			test: void 0
		}));
		return kt;
	}
	onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
	return schema[SCALAR$1];
}
function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
	const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[SCALAR$1];
	if (schema.compat) {
		const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[SCALAR$1];
		if (tag.tag !== compat.tag) onError(token, "TAG_RESOLVE_FAILED", `Value may be parsed as either ${directives.tagString(tag.tag)} or ${directives.tagString(compat.tag)}`, true);
	}
	return tag;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
	if (before) {
		pos ?? (pos = before.length);
		for (let i = pos - 1; i >= 0; --i) {
			let st = before[i];
			switch (st.type) {
				case "space":
				case "comment":
				case "newline":
					offset -= st.source.length;
					continue;
			}
			st = before[++i];
			while (st?.type === "space") {
				offset += st.source.length;
				st = before[++i];
			}
			break;
		}
	}
	return offset;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/compose-node.js
var CN = {
	composeNode: composeNode$1,
	composeEmptyNode
};
function composeNode$1(ctx, token, props, onError) {
	const atKey = ctx.atKey;
	const { spaceBefore, comment, anchor, tag } = props;
	let node;
	let isSrcToken = true;
	switch (token.type) {
		case "alias":
			node = composeAlias(ctx, token, onError);
			if (anchor || tag) onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
			break;
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "block-scalar":
			node = composeScalar(ctx, token, tag, onError);
			if (anchor) node.anchor = anchor.source.substring(1);
			break;
		case "block-map":
		case "block-seq":
		case "flow-collection":
			try {
				node = composeCollection(CN, ctx, token, props, onError);
				if (anchor) node.anchor = anchor.source.substring(1);
			} catch (error) {
				onError(token, "RESOURCE_EXHAUSTION", error instanceof Error ? error.message : String(error));
			}
			break;
		default:
			onError(token, "UNEXPECTED_TOKEN", token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`);
			isSrcToken = false;
	}
	node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
	if (anchor && node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	if (atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) onError(tag ?? token, "NON_STRING_KEY", "With stringKeys, all keys must be strings");
	if (spaceBefore) node.spaceBefore = true;
	if (comment) if (token.type === "scalar" && token.source === "") node.comment = comment;
	else node.commentBefore = comment;
	if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
	return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
	const node = composeScalar(ctx, {
		type: "scalar",
		offset: emptyScalarPosition(offset, before, pos),
		indent: -1,
		source: ""
	}, tag, onError);
	if (anchor) {
		node.anchor = anchor.source.substring(1);
		if (node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
	}
	if (spaceBefore) node.spaceBefore = true;
	if (comment) {
		node.comment = comment;
		node.range[2] = end;
	}
	return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
	const alias = new Alias(source.substring(1));
	if (alias.source === "") onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
	if (alias.source.endsWith(":")) onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
	const valueEnd = offset + source.length;
	const re = resolveEnd(end, valueEnd, options.strict, onError);
	alias.range = [
		offset,
		valueEnd,
		re.offset
	];
	if (re.comment) alias.comment = re.comment;
	return alias;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
	const doc = new Document(void 0, Object.assign({ _directives: directives }, options));
	const ctx = {
		atKey: false,
		atRoot: true,
		directives: doc.directives,
		options: doc.options,
		schema: doc.schema
	};
	const props = resolveProps(start, {
		indicator: "doc-start",
		next: value ?? end?.[0],
		offset,
		onError,
		parentIndent: 0,
		startOnNewline: true
	});
	if (props.found) {
		doc.directives.docStart = true;
		if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline) onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
	}
	doc.contents = value ? composeNode$1(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
	const contentEnd = doc.contents.range[2];
	const re = resolveEnd(end, contentEnd, false, onError);
	if (re.comment) doc.comment = re.comment;
	doc.range = [
		offset,
		contentEnd,
		re.offset
	];
	return doc;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
	if (typeof src === "number") return [src, src + 1];
	if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
	const { offset, source } = src;
	return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
	let comment = "";
	let atComment = false;
	let afterEmptyLine = false;
	for (let i = 0; i < prelude.length; ++i) {
		const source = prelude[i];
		switch (source[0]) {
			case "#":
				comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
				atComment = true;
				afterEmptyLine = false;
				break;
			case "%":
				if (prelude[i + 1]?.[0] !== "#") i += 1;
				atComment = false;
				break;
			default:
				if (!atComment) afterEmptyLine = true;
				atComment = false;
		}
	}
	return {
		comment,
		afterEmptyLine
	};
}
/**
* Compose a stream of CST nodes into a stream of YAML Documents.
*
* ```ts
* import { Composer, Parser } from 'yaml'
*
* const src: string = ...
* const tokens = new Parser().parse(src)
* const docs = new Composer().compose(tokens)
* ```
*/
var Composer = class {
	constructor(options = {}) {
		this.doc = null;
		this.atDirectives = false;
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
		this.onError = (source, code, message, warning) => {
			const pos = getErrorPos(source);
			if (warning) this.warnings.push(new YAMLWarning(pos, code, message));
			else this.errors.push(new YAMLParseError(pos, code, message));
		};
		this.directives = new Directives({ version: options.version || "1.2" });
		this.options = options;
	}
	decorate(doc, afterDoc) {
		const { comment, afterEmptyLine } = parsePrelude(this.prelude);
		if (comment) {
			const dc = doc.contents;
			if (afterDoc) doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
			else if (afterEmptyLine || doc.directives.docStart || !dc) doc.commentBefore = comment;
			else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
				let it = dc.items[0];
				if (isPair(it)) it = it.key;
				const cb = it.commentBefore;
				it.commentBefore = cb ? `${comment}\n${cb}` : comment;
			} else {
				const cb = dc.commentBefore;
				dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
			}
		}
		if (afterDoc) {
			for (let i = 0; i < this.errors.length; ++i) doc.errors.push(this.errors[i]);
			for (let i = 0; i < this.warnings.length; ++i) doc.warnings.push(this.warnings[i]);
		} else {
			doc.errors = this.errors;
			doc.warnings = this.warnings;
		}
		this.prelude = [];
		this.errors = [];
		this.warnings = [];
	}
	/**
	* Current stream status information.
	*
	* Mostly useful at the end of input for an empty stream.
	*/
	streamInfo() {
		return {
			comment: parsePrelude(this.prelude).comment,
			directives: this.directives,
			errors: this.errors,
			warnings: this.warnings
		};
	}
	/**
	* Compose tokens into documents.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*compose(tokens, forceDoc = false, endOffset = -1) {
		for (const token of tokens) yield* this.next(token);
		yield* this.end(forceDoc, endOffset);
	}
	/** Advance the composer by one CST token. */
	*next(token) {
		switch (token.type) {
			case "directive":
				this.directives.add(token.source, (offset, message, warning) => {
					const pos = getErrorPos(token);
					pos[0] += offset;
					this.onError(pos, "BAD_DIRECTIVE", message, warning);
				});
				this.prelude.push(token.source);
				this.atDirectives = true;
				break;
			case "document": {
				const doc = composeDoc(this.options, this.directives, token, this.onError);
				if (this.atDirectives && !doc.directives.docStart) this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
				this.decorate(doc, false);
				if (this.doc) yield this.doc;
				this.doc = doc;
				this.atDirectives = false;
				break;
			}
			case "byte-order-mark":
			case "space": break;
			case "comment":
			case "newline":
				this.prelude.push(token.source);
				break;
			case "error": {
				const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
				const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
				if (this.atDirectives || !this.doc) this.errors.push(error);
				else this.doc.errors.push(error);
				break;
			}
			case "doc-end": {
				if (!this.doc) {
					this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", "Unexpected doc-end without preceding document"));
					break;
				}
				this.doc.directives.docEnd = true;
				const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
				this.decorate(this.doc, true);
				if (end.comment) {
					const dc = this.doc.comment;
					this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
				}
				this.doc.range[2] = end.offset;
				break;
			}
			default: this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
		}
	}
	/**
	* Call at end of input to yield any remaining document.
	*
	* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
	* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
	*/
	*end(forceDoc = false, endOffset = -1) {
		if (this.doc) {
			this.decorate(this.doc, true);
			yield this.doc;
			this.doc = null;
		} else if (forceDoc) {
			const doc = new Document(void 0, Object.assign({ _directives: this.directives }, this.options));
			if (this.atDirectives) this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
			doc.range = [
				0,
				endOffset,
				endOffset
			];
			this.decorate(doc, false);
			yield doc;
		}
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove item");
/**
* Apply a visitor to a CST document or item.
*
* Walks through the tree (depth-first) starting from the root, calling a
* `visitor` function with two arguments when entering each item:
*   - `item`: The current item, which included the following members:
*     - `start: SourceToken[]` – Source tokens before the key or value,
*       possibly including its anchor or tag.
*     - `key?: Token | null` – Set for pair values. May then be `null`, if
*       the key before the `:` separator is empty.
*     - `sep?: SourceToken[]` – Source tokens between the key and the value,
*       which should include the `:` map value indicator if `value` is set.
*     - `value?: Token` – The value of a sequence item, or of a map pair.
*   - `path`: The steps from the root to the current node, as an array of
*     `['key' | 'value', number]` tuples.
*
* The return value of the visitor may be used to control the traversal:
*   - `undefined` (default): Do nothing and continue
*   - `visit.SKIP`: Do not visit the children of this token, continue with
*      next sibling
*   - `visit.BREAK`: Terminate traversal completely
*   - `visit.REMOVE`: Remove the current item, then continue with the next one
*   - `number`: Set the index of the next step. This is useful especially if
*     the index of the current token has changed.
*   - `function`: Define the next visitor for this item. After the original
*     visitor is called on item entry, next visitors are called after handling
*     a non-empty `key` and when exiting the item.
*/
function visit(cst, visitor) {
	if ("type" in cst && cst.type === "document") cst = {
		start: cst.start,
		value: cst.value
	};
	_visit(Object.freeze([]), cst, visitor);
}
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current item */
visit.SKIP = SKIP;
/** Remove the current item */
visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */
visit.itemAtPath = (cst, path) => {
	let item = cst;
	for (const [field, index] of path) {
		const tok = item?.[field];
		if (tok && "items" in tok) item = tok.items[index];
		else return void 0;
	}
	return item;
};
/**
* Get the immediate parent collection of the item at `path` from `cst` as the root.
*
* Throws an error if the collection is not found, which should never happen if the item itself exists.
*/
visit.parentCollection = (cst, path) => {
	const parent = visit.itemAtPath(cst, path.slice(0, -1));
	const field = path[path.length - 1][0];
	const coll = parent?.[field];
	if (coll && "items" in coll) return coll;
	throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
	let ctrl = visitor(item, path);
	if (typeof ctrl === "symbol") return ctrl;
	for (const field of ["key", "value"]) {
		const token = item[field];
		if (token && "items" in token) {
			for (let i = 0; i < token.items.length; ++i) {
				const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
				if (typeof ci === "number") i = ci - 1;
				else if (ci === BREAK) return BREAK;
				else if (ci === REMOVE) {
					token.items.splice(i, 1);
					i -= 1;
				}
			}
			if (typeof ctrl === "function" && field === "key") ctrl = ctrl(item, path);
		}
	}
	return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */
function tokenType(source) {
	switch (source) {
		case "﻿": return "byte-order-mark";
		case "": return "doc-mode";
		case "": return "flow-error-end";
		case "": return "scalar";
		case "---": return "doc-start";
		case "...": return "doc-end";
		case "":
		case "\n":
		case "\r\n": return "newline";
		case "-": return "seq-item-ind";
		case "?": return "explicit-key-ind";
		case ":": return "map-value-ind";
		case "{": return "flow-map-start";
		case "}": return "flow-map-end";
		case "[": return "flow-seq-start";
		case "]": return "flow-seq-end";
		case ",": return "comma";
	}
	switch (source[0]) {
		case " ":
		case "	": return "space";
		case "#": return "comment";
		case "%": return "directive-line";
		case "*": return "alias";
		case "&": return "anchor";
		case "!": return "tag";
		case "'": return "single-quoted-scalar";
		case "\"": return "double-quoted-scalar";
		case "|":
		case ">": return "block-scalar-header";
	}
	return null;
}
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty$1(ch) {
	switch (ch) {
		case void 0:
		case " ":
		case "\n":
		case "\r":
		case "	": return true;
		default: return false;
	}
}
var hexDigits = /* @__PURE__ */ new Set("0123456789ABCDEFabcdef");
var tagChars = /* @__PURE__ */ new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = /* @__PURE__ */ new Set(",[]{}");
var invalidAnchorChars = /* @__PURE__ */ new Set(" ,[]{}\n\r	");
var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
/**
* Splits an input string into lexical tokens, i.e. smaller strings that are
* easily identifiable by `tokens.tokenType()`.
*
* Lexing starts always in a "stream" context. Incomplete input may be buffered
* until a complete token can be emitted.
*
* In addition to slices of the original input, the following control characters
* may also be emitted:
*
* - `\x02` (Start of Text): A document starts with the next token
* - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
* - `\x1f` (Unit Separator): Next token is a scalar value
* - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
*/
var Lexer = class {
	constructor() {
		/**
		* Flag indicating whether the end of the current buffer marks the end of
		* all input
		*/
		this.atEnd = false;
		/**
		* Explicit indent set in block scalar header, as an offset from the current
		* minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
		* explicitly set.
		*/
		this.blockScalarIndent = -1;
		/**
		* Block scalars that include a + (keep) chomping indicator in their header
		* include trailing empty lines, which are otherwise excluded from the
		* scalar's contents.
		*/
		this.blockScalarKeep = false;
		/** Current input */
		this.buffer = "";
		/**
		* Flag noting whether the map value indicator : can immediately follow this
		* node within a flow context.
		*/
		this.flowKey = false;
		/** Count of surrounding flow collection levels. */
		this.flowLevel = 0;
		/**
		* Minimum level of indentation required for next lines to be parsed as a
		* part of the current scalar value.
		*/
		this.indentNext = 0;
		/** Indentation level of the current line. */
		this.indentValue = 0;
		/** Position of the next \n character. */
		this.lineEndPos = null;
		/** Stores the state of the lexer if reaching the end of incpomplete input */
		this.next = null;
		/** A pointer to `buffer`; the current position of the lexer. */
		this.pos = 0;
	}
	/**
	* Generate YAML tokens from the `source` string. If `incomplete`,
	* a part of the last line may be left as a buffer for the next call.
	*
	* @returns A generator of lexical tokens
	*/
	*lex(source, incomplete = false) {
		if (source) {
			if (typeof source !== "string") throw TypeError("source is not a string");
			this.buffer = this.buffer ? this.buffer + source : source;
			this.lineEndPos = null;
		}
		this.atEnd = !incomplete;
		let next = this.next ?? "stream";
		while (next && (incomplete || this.hasChars(1))) next = yield* this.parseNext(next);
	}
	atLineEnd() {
		let i = this.pos;
		let ch = this.buffer[i];
		while (ch === " " || ch === "	") ch = this.buffer[++i];
		if (!ch || ch === "#" || ch === "\n") return true;
		if (ch === "\r") return this.buffer[i + 1] === "\n";
		return false;
	}
	charAt(n) {
		return this.buffer[this.pos + n];
	}
	continueScalar(offset) {
		let ch = this.buffer[offset];
		if (this.indentNext > 0) {
			let indent = 0;
			while (ch === " ") ch = this.buffer[++indent + offset];
			if (ch === "\r") {
				const next = this.buffer[indent + offset + 1];
				if (next === "\n" || !next && !this.atEnd) return offset + indent + 1;
			}
			return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
		}
		if (ch === "-" || ch === ".") {
			const dt = this.buffer.substr(offset, 3);
			if ((dt === "---" || dt === "...") && isEmpty$1(this.buffer[offset + 3])) return -1;
		}
		return offset;
	}
	getLine() {
		let end = this.lineEndPos;
		if (typeof end !== "number" || end !== -1 && end < this.pos) {
			end = this.buffer.indexOf("\n", this.pos);
			this.lineEndPos = end;
		}
		if (end === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
		if (this.buffer[end - 1] === "\r") end -= 1;
		return this.buffer.substring(this.pos, end);
	}
	hasChars(n) {
		return this.pos + n <= this.buffer.length;
	}
	setNext(state) {
		this.buffer = this.buffer.substring(this.pos);
		this.pos = 0;
		this.lineEndPos = null;
		this.next = state;
		return null;
	}
	peek(n) {
		return this.buffer.substr(this.pos, n);
	}
	*parseNext(next) {
		switch (next) {
			case "stream": return yield* this.parseStream();
			case "line-start": return yield* this.parseLineStart();
			case "block-start": return yield* this.parseBlockStart();
			case "doc": return yield* this.parseDocument();
			case "flow": return yield* this.parseFlowCollection();
			case "quoted-scalar": return yield* this.parseQuotedScalar();
			case "block-scalar": return yield* this.parseBlockScalar();
			case "plain-scalar": return yield* this.parsePlainScalar();
		}
	}
	*parseStream() {
		let line = this.getLine();
		if (line === null) return this.setNext("stream");
		if (line[0] === "﻿") {
			yield* this.pushCount(1);
			line = line.substring(1);
		}
		if (line[0] === "%") {
			let dirEnd = line.length;
			let cs = line.indexOf("#");
			while (cs !== -1) {
				const ch = line[cs - 1];
				if (ch === " " || ch === "	") {
					dirEnd = cs - 1;
					break;
				} else cs = line.indexOf("#", cs + 1);
			}
			while (true) {
				const ch = line[dirEnd - 1];
				if (ch === " " || ch === "	") dirEnd -= 1;
				else break;
			}
			const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
			yield* this.pushCount(line.length - n);
			this.pushNewline();
			return "stream";
		}
		if (this.atLineEnd()) {
			const sp = yield* this.pushSpaces(true);
			yield* this.pushCount(line.length - sp);
			yield* this.pushNewline();
			return "stream";
		}
		yield "";
		return yield* this.parseLineStart();
	}
	*parseLineStart() {
		const ch = this.charAt(0);
		if (!ch && !this.atEnd) return this.setNext("line-start");
		if (ch === "-" || ch === ".") {
			if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
			const s = this.peek(3);
			if ((s === "---" || s === "...") && isEmpty$1(this.charAt(3))) {
				yield* this.pushCount(3);
				this.indentValue = 0;
				this.indentNext = 0;
				return s === "---" ? "doc" : "stream";
			}
		}
		this.indentValue = yield* this.pushSpaces(false);
		if (this.indentNext > this.indentValue && !isEmpty$1(this.charAt(1))) this.indentNext = this.indentValue;
		return yield* this.parseBlockStart();
	}
	*parseBlockStart() {
		const [ch0, ch1] = this.peek(2);
		if (!ch1 && !this.atEnd) return this.setNext("block-start");
		if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty$1(ch1)) {
			const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
			this.indentNext = this.indentValue + 1;
			this.indentValue += n;
			return "block-start";
		}
		return "doc";
	}
	*parseDocument() {
		yield* this.pushSpaces(true);
		const line = this.getLine();
		if (line === null) return this.setNext("doc");
		let n = yield* this.pushIndicators();
		switch (line[n]) {
			case "#": yield* this.pushCount(line.length - n);
			case void 0:
				yield* this.pushNewline();
				return yield* this.parseLineStart();
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel = 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				return "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "doc";
			case "\"":
			case "'": return yield* this.parseQuotedScalar();
			case "|":
			case ">":
				n += yield* this.parseBlockScalarHeader();
				n += yield* this.pushSpaces(true);
				yield* this.pushCount(line.length - n);
				yield* this.pushNewline();
				return yield* this.parseBlockScalar();
			default: return yield* this.parsePlainScalar();
		}
	}
	*parseFlowCollection() {
		let nl, sp;
		let indent = -1;
		do {
			nl = yield* this.pushNewline();
			if (nl > 0) {
				sp = yield* this.pushSpaces(false);
				this.indentValue = indent = sp;
			} else sp = 0;
			sp += yield* this.pushSpaces(true);
		} while (nl + sp > 0);
		const line = this.getLine();
		if (line === null) return this.setNext("flow");
		if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty$1(line[3])) {
			if (!(indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}"))) {
				this.flowLevel = 0;
				yield "";
				return yield* this.parseLineStart();
			}
		}
		let n = 0;
		while (line[n] === ",") {
			n += yield* this.pushCount(1);
			n += yield* this.pushSpaces(true);
			this.flowKey = false;
		}
		n += yield* this.pushIndicators();
		switch (line[n]) {
			case void 0: return "flow";
			case "#":
				yield* this.pushCount(line.length - n);
				return "flow";
			case "{":
			case "[":
				yield* this.pushCount(1);
				this.flowKey = false;
				this.flowLevel += 1;
				return "flow";
			case "}":
			case "]":
				yield* this.pushCount(1);
				this.flowKey = true;
				this.flowLevel -= 1;
				return this.flowLevel ? "flow" : "doc";
			case "*":
				yield* this.pushUntil(isNotAnchorChar);
				return "flow";
			case "\"":
			case "'":
				this.flowKey = true;
				return yield* this.parseQuotedScalar();
			case ":": {
				const next = this.charAt(1);
				if (this.flowKey || isEmpty$1(next) || next === ",") {
					this.flowKey = false;
					yield* this.pushCount(1);
					yield* this.pushSpaces(true);
					return "flow";
				}
			}
			default:
				this.flowKey = false;
				return yield* this.parsePlainScalar();
		}
	}
	*parseQuotedScalar() {
		const quote = this.charAt(0);
		let end = this.buffer.indexOf(quote, this.pos + 1);
		if (quote === "'") while (end !== -1 && this.buffer[end + 1] === "'") end = this.buffer.indexOf("'", end + 2);
		else while (end !== -1) {
			let n = 0;
			while (this.buffer[end - 1 - n] === "\\") n += 1;
			if (n % 2 === 0) break;
			end = this.buffer.indexOf("\"", end + 1);
		}
		const qb = this.buffer.substring(0, end);
		let nl = qb.indexOf("\n", this.pos);
		if (nl !== -1) {
			while (nl !== -1) {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = qb.indexOf("\n", cs);
			}
			if (nl !== -1) end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
		}
		if (end === -1) {
			if (!this.atEnd) return this.setNext("quoted-scalar");
			end = this.buffer.length;
		}
		yield* this.pushToIndex(end + 1, false);
		return this.flowLevel ? "flow" : "doc";
	}
	*parseBlockScalarHeader() {
		this.blockScalarIndent = -1;
		this.blockScalarKeep = false;
		let i = this.pos;
		while (true) {
			const ch = this.buffer[++i];
			if (ch === "+") this.blockScalarKeep = true;
			else if (ch > "0" && ch <= "9") this.blockScalarIndent = Number(ch) - 1;
			else if (ch !== "-") break;
		}
		return yield* this.pushUntil((ch) => isEmpty$1(ch) || ch === "#");
	}
	*parseBlockScalar() {
		let nl = this.pos - 1;
		let indent = 0;
		let ch;
		loop: for (let i = this.pos; ch = this.buffer[i]; ++i) switch (ch) {
			case " ":
				indent += 1;
				break;
			case "\n":
				nl = i;
				indent = 0;
				break;
			case "\r": {
				const next = this.buffer[i + 1];
				if (!next && !this.atEnd) return this.setNext("block-scalar");
				if (next === "\n") break;
			}
			default: break loop;
		}
		if (!ch && !this.atEnd) return this.setNext("block-scalar");
		if (indent >= this.indentNext) {
			if (this.blockScalarIndent === -1) this.indentNext = indent;
			else this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
			do {
				const cs = this.continueScalar(nl + 1);
				if (cs === -1) break;
				nl = this.buffer.indexOf("\n", cs);
			} while (nl !== -1);
			if (nl === -1) {
				if (!this.atEnd) return this.setNext("block-scalar");
				nl = this.buffer.length;
			}
		}
		let i = nl + 1;
		ch = this.buffer[i];
		while (ch === " ") ch = this.buffer[++i];
		if (ch === "	") {
			while (ch === "	" || ch === " " || ch === "\r" || ch === "\n") ch = this.buffer[++i];
			nl = i - 1;
		} else if (!this.blockScalarKeep) do {
			let i = nl - 1;
			let ch = this.buffer[i];
			if (ch === "\r") ch = this.buffer[--i];
			const lastChar = i;
			while (ch === " ") ch = this.buffer[--i];
			if (ch === "\n" && i >= this.pos && i + 1 + indent > lastChar) nl = i;
			else break;
		} while (true);
		yield "";
		yield* this.pushToIndex(nl + 1, true);
		return yield* this.parseLineStart();
	}
	*parsePlainScalar() {
		const inFlow = this.flowLevel > 0;
		let end = this.pos - 1;
		let i = this.pos - 1;
		let ch;
		while (ch = this.buffer[++i]) if (ch === ":") {
			const next = this.buffer[i + 1];
			if (isEmpty$1(next) || inFlow && flowIndicatorChars.has(next)) break;
			end = i;
		} else if (isEmpty$1(ch)) {
			let next = this.buffer[i + 1];
			if (ch === "\r") if (next === "\n") {
				i += 1;
				ch = "\n";
				next = this.buffer[i + 1];
			} else end = i;
			if (next === "#" || inFlow && flowIndicatorChars.has(next)) break;
			if (ch === "\n") {
				const cs = this.continueScalar(i + 1);
				if (cs === -1) break;
				i = Math.max(i, cs - 2);
			}
		} else {
			if (inFlow && flowIndicatorChars.has(ch)) break;
			end = i;
		}
		if (!ch && !this.atEnd) return this.setNext("plain-scalar");
		yield "";
		yield* this.pushToIndex(end + 1, true);
		return inFlow ? "flow" : "doc";
	}
	*pushCount(n) {
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos += n;
			return n;
		}
		return 0;
	}
	*pushToIndex(i, allowEmpty) {
		const s = this.buffer.slice(this.pos, i);
		if (s) {
			yield s;
			this.pos += s.length;
			return s.length;
		} else if (allowEmpty) yield "";
		return 0;
	}
	*pushIndicators() {
		let n = 0;
		loop: while (true) {
			switch (this.charAt(0)) {
				case "!":
					n += yield* this.pushTag();
					n += yield* this.pushSpaces(true);
					continue loop;
				case "&":
					n += yield* this.pushUntil(isNotAnchorChar);
					n += yield* this.pushSpaces(true);
					continue loop;
				case "-":
				case "?":
				case ":": {
					const inFlow = this.flowLevel > 0;
					const ch1 = this.charAt(1);
					if (isEmpty$1(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
						if (!inFlow) this.indentNext = this.indentValue + 1;
						else if (this.flowKey) this.flowKey = false;
						n += yield* this.pushCount(1);
						n += yield* this.pushSpaces(true);
						continue loop;
					}
				}
			}
			break loop;
		}
		return n;
	}
	*pushTag() {
		if (this.charAt(1) === "<") {
			let i = this.pos + 2;
			let ch = this.buffer[i];
			while (!isEmpty$1(ch) && ch !== ">") ch = this.buffer[++i];
			return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
		} else {
			let i = this.pos + 1;
			let ch = this.buffer[i];
			while (ch) if (tagChars.has(ch)) ch = this.buffer[++i];
			else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) ch = this.buffer[i += 3];
			else break;
			return yield* this.pushToIndex(i, false);
		}
	}
	*pushNewline() {
		const ch = this.buffer[this.pos];
		if (ch === "\n") return yield* this.pushCount(1);
		else if (ch === "\r" && this.charAt(1) === "\n") return yield* this.pushCount(2);
		else return 0;
	}
	*pushSpaces(allowTabs) {
		let i = this.pos - 1;
		let ch;
		do
			ch = this.buffer[++i];
		while (ch === " " || allowTabs && ch === "	");
		const n = i - this.pos;
		if (n > 0) {
			yield this.buffer.substr(this.pos, n);
			this.pos = i;
		}
		return n;
	}
	*pushUntil(test) {
		let i = this.pos;
		let ch = this.buffer[i];
		while (!test(ch)) ch = this.buffer[++i];
		return yield* this.pushToIndex(i, false);
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/parse/line-counter.js
/**
* Tracks newlines during parsing in order to provide an efficient API for
* determining the one-indexed `{ line, col }` position for any offset
* within the input.
*/
var LineCounter = class {
	constructor() {
		this.lineStarts = [];
		/**
		* Should be called in ascending order. Otherwise, call
		* `lineCounter.lineStarts.sort()` before calling `linePos()`.
		*/
		this.addNewLine = (offset) => this.lineStarts.push(offset);
		/**
		* Performs a binary search and returns the 1-indexed { line, col }
		* position of `offset`. If `line === 0`, `addNewLine` has never been
		* called or `offset` is before the first known newline.
		*/
		this.linePos = (offset) => {
			let low = 0;
			let high = this.lineStarts.length;
			while (low < high) {
				const mid = low + high >> 1;
				if (this.lineStarts[mid] < offset) low = mid + 1;
				else high = mid;
			}
			if (this.lineStarts[low] === offset) return {
				line: low + 1,
				col: 1
			};
			if (low === 0) return {
				line: 0,
				col: offset
			};
			const start = this.lineStarts[low - 1];
			return {
				line: low,
				col: offset - start + 1
			};
		};
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list, type) {
	for (let i = 0; i < list.length; ++i) if (list[i].type === type) return true;
	return false;
}
function findNonEmptyIndex(list) {
	for (let i = 0; i < list.length; ++i) switch (list[i].type) {
		case "space":
		case "comment":
		case "newline": break;
		default: return i;
	}
	return -1;
}
function isFlowToken(token) {
	switch (token?.type) {
		case "alias":
		case "scalar":
		case "single-quoted-scalar":
		case "double-quoted-scalar":
		case "flow-collection": return true;
		default: return false;
	}
}
function getPrevProps(parent) {
	switch (parent.type) {
		case "document": return parent.start;
		case "block-map": {
			const it = parent.items[parent.items.length - 1];
			return it.sep ?? it.start;
		}
		case "block-seq": return parent.items[parent.items.length - 1].start;
		/* istanbul ignore next should not happen */
		default: return [];
	}
}
/** Note: May modify input array */
function getFirstKeyStartProps(prev) {
	if (prev.length === 0) return [];
	let i = prev.length;
	loop: while (--i >= 0) switch (prev[i].type) {
		case "doc-start":
		case "explicit-key-ind":
		case "map-value-ind":
		case "seq-item-ind":
		case "newline": break loop;
	}
	while (prev[++i]?.type === "space");
	return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
	if (source.length < 1e5) Array.prototype.push.apply(target, source);
	else for (let i = 0; i < source.length; ++i) target.push(source[i]);
}
function fixFlowSeqItems(fc) {
	if (fc.start.type === "flow-seq-start") {
		for (const it of fc.items) if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
			if (it.key) it.value = it.key;
			delete it.key;
			if (isFlowToken(it.value)) if (it.value.end) arrayPushArray(it.value.end, it.sep);
			else it.value.end = it.sep;
			else arrayPushArray(it.start, it.sep);
			delete it.sep;
		}
	}
}
/**
* A YAML concrete syntax tree (CST) parser
*
* ```ts
* const src: string = ...
* for (const token of new Parser().parse(src)) {
*   // token: Token
* }
* ```
*
* To use the parser with a user-provided lexer:
*
* ```ts
* function* parse(source: string, lexer: Lexer) {
*   const parser = new Parser()
*   for (const lexeme of lexer.lex(source))
*     yield* parser.next(lexeme)
*   yield* parser.end()
* }
*
* const src: string = ...
* const lexer = new Lexer()
* for (const token of parse(src, lexer)) {
*   // token: Token
* }
* ```
*/
var Parser = class {
	/**
	* @param onNewLine - If defined, called separately with the start position of
	*   each new line (in `parse()`, including the start of input).
	*/
	constructor(onNewLine) {
		/** If true, space and sequence indicators count as indentation */
		this.atNewLine = true;
		/** If true, next token is a scalar value */
		this.atScalar = false;
		/** Current indentation level */
		this.indent = 0;
		/** Current offset since the start of parsing */
		this.offset = 0;
		/** On the same line with a block map key */
		this.onKeyLine = false;
		/** Top indicates the node that's currently being built */
		this.stack = [];
		/** The source of the current token, set in parse() */
		this.source = "";
		/** The type of the current token, set in parse() */
		this.type = "";
		this.lexer = new Lexer();
		this.onNewLine = onNewLine;
	}
	/**
	* Parse `source` as a YAML stream.
	* If `incomplete`, a part of the last line may be left as a buffer for the next call.
	*
	* Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
	*
	* @returns A generator of tokens representing each directive, document, and other structure.
	*/
	*parse(source, incomplete = false) {
		if (this.onNewLine && this.offset === 0) this.onNewLine(0);
		for (const lexeme of this.lexer.lex(source, incomplete)) yield* this.next(lexeme);
		if (!incomplete) yield* this.end();
	}
	/**
	* Advance the parser by the `source` of one lexical token.
	*/
	*next(source) {
		this.source = source;
		if (this.atScalar) {
			this.atScalar = false;
			yield* this.step();
			this.offset += source.length;
			return;
		}
		const type = tokenType(source);
		if (!type) {
			const message = `Not a YAML token: ${source}`;
			yield* this.pop({
				type: "error",
				offset: this.offset,
				message,
				source
			});
			this.offset += source.length;
		} else if (type === "scalar") {
			this.atNewLine = false;
			this.atScalar = true;
			this.type = "scalar";
		} else {
			this.type = type;
			yield* this.step();
			switch (type) {
				case "newline":
					this.atNewLine = true;
					this.indent = 0;
					if (this.onNewLine) this.onNewLine(this.offset + source.length);
					break;
				case "space":
					if (this.atNewLine && source[0] === " ") this.indent += source.length;
					break;
				case "explicit-key-ind":
				case "map-value-ind":
				case "seq-item-ind":
					if (this.atNewLine) this.indent += source.length;
					break;
				case "doc-mode":
				case "flow-error-end": return;
				default: this.atNewLine = false;
			}
			this.offset += source.length;
		}
	}
	/** Call at end of input to push out any remaining constructions */
	*end() {
		while (this.stack.length > 0) yield* this.pop();
	}
	get sourceToken() {
		return {
			type: this.type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	*step() {
		const top = this.peek(1);
		if (this.type === "doc-end" && top?.type !== "doc-end") {
			while (this.stack.length > 0) yield* this.pop();
			this.stack.push({
				type: "doc-end",
				offset: this.offset,
				source: this.source
			});
			return;
		}
		if (!top) return yield* this.stream();
		switch (top.type) {
			case "document": return yield* this.document(top);
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return yield* this.scalar(top);
			case "block-scalar": return yield* this.blockScalar(top);
			case "block-map": return yield* this.blockMap(top);
			case "block-seq": return yield* this.blockSequence(top);
			case "flow-collection": return yield* this.flowCollection(top);
			case "doc-end": return yield* this.documentEnd(top);
		}
		/* istanbul ignore next should not happen */
		yield* this.pop();
	}
	peek(n) {
		return this.stack[this.stack.length - n];
	}
	*pop(error) {
		const token = error ?? this.stack.pop();
		/* istanbul ignore if should not happen */
		if (!token) yield {
			type: "error",
			offset: this.offset,
			source: "",
			message: "Tried to pop an empty stack"
		};
		else if (this.stack.length === 0) yield token;
		else {
			const top = this.peek(1);
			if (token.type === "block-scalar") token.indent = "indent" in top ? top.indent : 0;
			else if (token.type === "flow-collection" && top.type === "document") token.indent = 0;
			if (token.type === "flow-collection") fixFlowSeqItems(token);
			switch (top.type) {
				case "document":
					top.value = token;
					break;
				case "block-scalar":
					top.props.push(token);
					break;
				case "block-map": {
					const it = top.items[top.items.length - 1];
					if (it.value) {
						top.items.push({
							start: [],
							key: token,
							sep: []
						});
						this.onKeyLine = true;
						return;
					} else if (it.sep) it.value = token;
					else {
						Object.assign(it, {
							key: token,
							sep: []
						});
						this.onKeyLine = !it.explicitKey;
						return;
					}
					break;
				}
				case "block-seq": {
					const it = top.items[top.items.length - 1];
					if (it.value) top.items.push({
						start: [],
						value: token
					});
					else it.value = token;
					break;
				}
				case "flow-collection": {
					const it = top.items[top.items.length - 1];
					if (!it || it.value) top.items.push({
						start: [],
						key: token,
						sep: []
					});
					else if (it.sep) it.value = token;
					else Object.assign(it, {
						key: token,
						sep: []
					});
					return;
				}
				/* istanbul ignore next should not happen */
				default:
					yield* this.pop();
					yield* this.pop(token);
			}
			if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
				const last = token.items[token.items.length - 1];
				if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
					if (top.type === "document") top.end = last.start;
					else top.items.push({ start: last.start });
					token.items.splice(-1, 1);
				}
			}
		}
	}
	*stream() {
		switch (this.type) {
			case "directive-line":
				yield {
					type: "directive",
					offset: this.offset,
					source: this.source
				};
				return;
			case "byte-order-mark":
			case "space":
			case "comment":
			case "newline":
				yield this.sourceToken;
				return;
			case "doc-mode":
			case "doc-start": {
				const doc = {
					type: "document",
					offset: this.offset,
					start: []
				};
				if (this.type === "doc-start") doc.start.push(this.sourceToken);
				this.stack.push(doc);
				return;
			}
		}
		yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML stream`,
			source: this.source
		};
	}
	*document(doc) {
		if (doc.value) return yield* this.lineEnd(doc);
		switch (this.type) {
			case "doc-start":
				if (findNonEmptyIndex(doc.start) !== -1) {
					yield* this.pop();
					yield* this.step();
				} else doc.start.push(this.sourceToken);
				return;
			case "anchor":
			case "tag":
			case "space":
			case "comment":
			case "newline":
				doc.start.push(this.sourceToken);
				return;
		}
		const bv = this.startBlockValue(doc);
		if (bv) this.stack.push(bv);
		else yield {
			type: "error",
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML document`,
			source: this.source
		};
	}
	*scalar(scalar) {
		if (this.type === "map-value-ind") {
			const start = getFirstKeyStartProps(getPrevProps(this.peek(2)));
			let sep;
			if (scalar.end) {
				sep = scalar.end;
				sep.push(this.sourceToken);
				delete scalar.end;
			} else sep = [this.sourceToken];
			const map = {
				type: "block-map",
				offset: scalar.offset,
				indent: scalar.indent,
				items: [{
					start,
					key: scalar,
					sep
				}]
			};
			this.onKeyLine = true;
			this.stack[this.stack.length - 1] = map;
		} else yield* this.lineEnd(scalar);
	}
	*blockScalar(scalar) {
		switch (this.type) {
			case "space":
			case "comment":
			case "newline":
				scalar.props.push(this.sourceToken);
				return;
			case "scalar":
				scalar.source = this.source;
				this.atNewLine = true;
				this.indent = 0;
				if (this.onNewLine) {
					let nl = this.source.indexOf("\n") + 1;
					while (nl !== 0) {
						this.onNewLine(this.offset + nl);
						nl = this.source.indexOf("\n", nl) + 1;
					}
				}
				yield* this.pop();
				break;
			/* istanbul ignore next should not happen */
			default:
				yield* this.pop();
				yield* this.step();
		}
	}
	*blockMap(map) {
		const it = map.items[map.items.length - 1];
		switch (this.type) {
			case "newline":
				this.onKeyLine = false;
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else map.items.push({ start: [this.sourceToken] });
				} else if (it.sep) it.sep.push(this.sourceToken);
				else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) map.items.push({ start: [this.sourceToken] });
				else if (it.sep) it.sep.push(this.sourceToken);
				else {
					if (this.atIndentedComment(it.start, map.indent)) {
						const end = map.items[map.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							map.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
		}
		if (this.indent >= map.indent) {
			const atMapIndent = !this.onKeyLine && this.indent === map.indent;
			const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
			let start = [];
			if (atNextItem && it.sep && !it.value) {
				const nl = [];
				for (let i = 0; i < it.sep.length; ++i) {
					const st = it.sep[i];
					switch (st.type) {
						case "newline":
							nl.push(i);
							break;
						case "space": break;
						case "comment":
							if (st.indent > map.indent) nl.length = 0;
							break;
						default: nl.length = 0;
					}
				}
				if (nl.length >= 2) start = it.sep.splice(nl[1]);
			}
			switch (this.type) {
				case "anchor":
				case "tag":
					if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({ start });
						this.onKeyLine = true;
					} else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "explicit-key-ind":
					if (!it.sep && !it.explicitKey) {
						it.start.push(this.sourceToken);
						it.explicitKey = true;
					} else if (atNextItem || it.value) {
						start.push(this.sourceToken);
						map.items.push({
							start,
							explicitKey: true
						});
					} else this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [this.sourceToken],
							explicitKey: true
						}]
					});
					this.onKeyLine = true;
					return;
				case "map-value-ind":
					if (it.explicitKey) if (!it.sep) if (includesToken(it.start, "newline")) Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					else {
						const start = getFirstKeyStartProps(it.start);
						this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key: null,
								sep: [this.sourceToken]
							}]
						});
					}
					else if (it.value) map.items.push({
						start: [],
						key: null,
						sep: [this.sourceToken]
					});
					else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start,
							key: null,
							sep: [this.sourceToken]
						}]
					});
					else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
						const start = getFirstKeyStartProps(it.start);
						const key = it.key;
						const sep = it.sep;
						sep.push(this.sourceToken);
						delete it.key;
						delete it.sep;
						this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key,
								sep
							}]
						});
					} else if (start.length > 0) it.sep = it.sep.concat(start, this.sourceToken);
					else it.sep.push(this.sourceToken);
					else if (!it.sep) Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.value || atNextItem) map.items.push({
						start,
						key: null,
						sep: [this.sourceToken]
					});
					else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start: [],
							key: null,
							sep: [this.sourceToken]
						}]
					});
					else it.sep.push(this.sourceToken);
					this.onKeyLine = true;
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (atNextItem || it.value) {
						map.items.push({
							start,
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					} else if (it.sep) this.stack.push(fs);
					else {
						Object.assign(it, {
							key: fs,
							sep: []
						});
						this.onKeyLine = true;
					}
					return;
				}
				default: {
					const bv = this.startBlockValue(map);
					if (bv) {
						if (bv.type === "block-seq") {
							if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
								yield* this.pop({
									type: "error",
									offset: this.offset,
									message: "Unexpected block-seq-ind on same line with key",
									source: this.source
								});
								return;
							}
						} else if (atMapIndent) map.items.push({ start });
						this.stack.push(bv);
						return;
					}
				}
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*blockSequence(seq) {
		const it = seq.items[seq.items.length - 1];
		switch (this.type) {
			case "newline":
				if (it.value) {
					const end = "end" in it.value ? it.value.end : void 0;
					if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
					else seq.items.push({ start: [this.sourceToken] });
				} else it.start.push(this.sourceToken);
				return;
			case "space":
			case "comment":
				if (it.value) seq.items.push({ start: [this.sourceToken] });
				else {
					if (this.atIndentedComment(it.start, seq.indent)) {
						const end = seq.items[seq.items.length - 2]?.value?.end;
						if (Array.isArray(end)) {
							arrayPushArray(end, it.start);
							end.push(this.sourceToken);
							seq.items.pop();
							return;
						}
					}
					it.start.push(this.sourceToken);
				}
				return;
			case "anchor":
			case "tag":
				if (it.value || this.indent <= seq.indent) break;
				it.start.push(this.sourceToken);
				return;
			case "seq-item-ind":
				if (this.indent !== seq.indent) break;
				if (it.value || includesToken(it.start, "seq-item-ind")) seq.items.push({ start: [this.sourceToken] });
				else it.start.push(this.sourceToken);
				return;
		}
		if (this.indent > seq.indent) {
			const bv = this.startBlockValue(seq);
			if (bv) {
				this.stack.push(bv);
				return;
			}
		}
		yield* this.pop();
		yield* this.step();
	}
	*flowCollection(fc) {
		const it = fc.items[fc.items.length - 1];
		if (this.type === "flow-error-end") {
			let top;
			do {
				yield* this.pop();
				top = this.peek(1);
			} while (top?.type === "flow-collection");
		} else if (fc.end.length === 0) {
			switch (this.type) {
				case "comma":
				case "explicit-key-ind":
					if (!it || it.sep) fc.items.push({ start: [this.sourceToken] });
					else it.start.push(this.sourceToken);
					return;
				case "map-value-ind":
					if (!it || it.value) fc.items.push({
						start: [],
						key: null,
						sep: [this.sourceToken]
					});
					else if (it.sep) it.sep.push(this.sourceToken);
					else Object.assign(it, {
						key: null,
						sep: [this.sourceToken]
					});
					return;
				case "space":
				case "comment":
				case "newline":
				case "anchor":
				case "tag":
					if (!it || it.value) fc.items.push({ start: [this.sourceToken] });
					else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": {
					const fs = this.flowScalar(this.type);
					if (!it || it.value) fc.items.push({
						start: [],
						key: fs,
						sep: []
					});
					else if (it.sep) this.stack.push(fs);
					else Object.assign(it, {
						key: fs,
						sep: []
					});
					return;
				}
				case "flow-map-end":
				case "flow-seq-end":
					fc.end.push(this.sourceToken);
					return;
			}
			const bv = this.startBlockValue(fc);
			/* istanbul ignore else should not happen */
			if (bv) this.stack.push(bv);
			else {
				yield* this.pop();
				yield* this.step();
			}
		} else {
			const parent = this.peek(2);
			if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
				yield* this.pop();
				yield* this.step();
			} else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
				const start = getFirstKeyStartProps(getPrevProps(parent));
				fixFlowSeqItems(fc);
				const sep = fc.end.splice(1, fc.end.length);
				sep.push(this.sourceToken);
				const map = {
					type: "block-map",
					offset: fc.offset,
					indent: fc.indent,
					items: [{
						start,
						key: fc,
						sep
					}]
				};
				this.onKeyLine = true;
				this.stack[this.stack.length - 1] = map;
			} else yield* this.lineEnd(fc);
		}
	}
	flowScalar(type) {
		if (this.onNewLine) {
			let nl = this.source.indexOf("\n") + 1;
			while (nl !== 0) {
				this.onNewLine(this.offset + nl);
				nl = this.source.indexOf("\n", nl) + 1;
			}
		}
		return {
			type,
			offset: this.offset,
			indent: this.indent,
			source: this.source
		};
	}
	startBlockValue(parent) {
		switch (this.type) {
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar": return this.flowScalar(this.type);
			case "block-scalar-header": return {
				type: "block-scalar",
				offset: this.offset,
				indent: this.indent,
				props: [this.sourceToken],
				source: ""
			};
			case "flow-map-start":
			case "flow-seq-start": return {
				type: "flow-collection",
				offset: this.offset,
				indent: this.indent,
				start: this.sourceToken,
				items: [],
				end: []
			};
			case "seq-item-ind": return {
				type: "block-seq",
				offset: this.offset,
				indent: this.indent,
				items: [{ start: [this.sourceToken] }]
			};
			case "explicit-key-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				start.push(this.sourceToken);
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						explicitKey: true
					}]
				};
			}
			case "map-value-ind": {
				this.onKeyLine = true;
				const start = getFirstKeyStartProps(getPrevProps(parent));
				return {
					type: "block-map",
					offset: this.offset,
					indent: this.indent,
					items: [{
						start,
						key: null,
						sep: [this.sourceToken]
					}]
				};
			}
		}
		return null;
	}
	atIndentedComment(start, indent) {
		if (this.type !== "comment") return false;
		if (this.indent <= indent) return false;
		return start.every((st) => st.type === "newline" || st.type === "space");
	}
	*documentEnd(docEnd) {
		if (this.type !== "doc-mode") {
			if (docEnd.end) docEnd.end.push(this.sourceToken);
			else docEnd.end = [this.sourceToken];
			if (this.type === "newline") yield* this.pop();
		}
	}
	*lineEnd(token) {
		switch (this.type) {
			case "comma":
			case "doc-start":
			case "doc-end":
			case "flow-seq-end":
			case "flow-map-end":
			case "map-value-ind":
				yield* this.pop();
				yield* this.step();
				break;
			case "newline": this.onKeyLine = false;
			default:
				if (token.end) token.end.push(this.sourceToken);
				else token.end = [this.sourceToken];
				if (this.type === "newline") yield* this.pop();
		}
	}
};
//#endregion
//#region ../../node_modules/.bun/yaml@2.9.0/node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
	const prettyErrors = options.prettyErrors !== false;
	return {
		lineCounter: options.lineCounter || prettyErrors && new LineCounter() || null,
		prettyErrors
	};
}
/** Parse an input string into a single YAML.Document */
function parseDocument(source, options = {}) {
	const { lineCounter, prettyErrors } = parseOptions(options);
	const parser = new Parser(lineCounter?.addNewLine);
	const composer = new Composer(options);
	let doc = null;
	for (const _doc of composer.compose(parser.parse(source), true, source.length)) if (!doc) doc = _doc;
	else if (doc.options.logLevel !== "silent") {
		doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
		break;
	}
	if (prettyErrors && lineCounter) {
		doc.errors.forEach(prettifyError(source, lineCounter));
		doc.warnings.forEach(prettifyError(source, lineCounter));
	}
	return doc;
}
function parse$3(src, reviver, options) {
	let _reviver = void 0;
	if (typeof reviver === "function") _reviver = reviver;
	else if (options === void 0 && reviver && typeof reviver === "object") options = reviver;
	const doc = parseDocument(src, options);
	if (!doc) return null;
	doc.warnings.forEach((warning) => warn(doc.options.logLevel, warning));
	if (doc.errors.length > 0) if (doc.options.logLevel !== "silent") throw doc.errors[0];
	else doc.errors = [];
	return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
//#endregion
//#region src/output/error.ts
var OpenapiToolError = class extends Error {
	code;
	details;
	exitCode;
	constructor(code, message, details, exitCode = 1) {
		super(message);
		this.name = "OpenapiToolError";
		this.code = code;
		this.details = details;
		this.exitCode = exitCode;
	}
};
function toErrorPayload(error) {
	if (error instanceof OpenapiToolError) return { error: {
		code: error.code,
		message: error.message,
		...error.details === void 0 ? {} : { details: error.details }
	} };
	return { error: {
		code: "INVALID_ARGUMENT",
		message: error instanceof Error ? error.message : String(error)
	} };
}
function getExitCode(error) {
	return error instanceof OpenapiToolError ? error.exitCode : 1;
}
//#endregion
//#region src/core/parse-document.ts
async function loadDocument(source) {
	const document = parseDocumentText(source.type === "file" ? await readFile(new URL(source.baseUri), "utf8") : await fetchRemoteText(source));
	validateOpenapiDocument(document);
	return {
		source,
		document
	};
}
function parseDocumentText(text) {
	try {
		const parsed = parse$3(text);
		if (!isJsonObject(parsed)) throw new OpenapiToolError("INVALID_OPENAPI", "OpenAPI document must be a JSON object");
		return parsed;
	} catch (error) {
		if (error instanceof OpenapiToolError) throw error;
		throw new OpenapiToolError("UNSUPPORTED_FORMAT", "OpenAPI document must be valid JSON or YAML", { cause: error instanceof Error ? error.message : String(error) });
	}
}
async function fetchRemoteText(source) {
	let response;
	try {
		response = await fetch(source.value, { method: "GET" });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new OpenapiToolError("REMOTE_FETCH_FAILED", `Failed to fetch remote OpenAPI document: ${source.value}`, {
			remote: source.value,
			cause: message
		});
	}
	if (!response.ok) throw new OpenapiToolError("REMOTE_FETCH_FAILED", `Remote OpenAPI document returned HTTP ${response.status}`, {
		remote: source.value,
		status: response.status,
		statusText: response.statusText
	});
	return response.text();
}
function validateOpenapiDocument(document) {
	const version = document.openapi;
	if (typeof version !== "string" || version.length === 0) throw new OpenapiToolError("INVALID_OPENAPI", "OpenAPI document must contain an openapi version");
	if (!/^3\.(0|1)(?:\.\d+)?(?:[-+].*)?$/.test(version)) throw new OpenapiToolError("UNSUPPORTED_OPENAPI_VERSION", "Only OpenAPI 3.0.x and 3.1.x are supported", { openapi: version });
	if (!isJsonObject(document.paths)) throw new OpenapiToolError("INVALID_OPENAPI", "OpenAPI document must contain a paths object");
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/convert-path-to-posix.js
var win32Sep = "\\";
function convertPathToPosix(filePath) {
	if (filePath.startsWith("\\\\?\\")) return filePath;
	return filePath.split(win32Sep).join("/");
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/is-windows.js
var isWindowsConst = /^win/.test(globalThis.process ? globalThis.process.platform : "");
var isWindows = () => isWindowsConst;
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/url.js
var forwardSlashPattern = /\//g;
var protocolPattern = /^(\w{2,}):\/\//i;
var jsonPointerSlash = /~1/g;
var jsonPointerTilde = /~0/g;
var isAbsoluteWin32Path = /^[a-zA-Z]:[\\/]/;
var urlEncodePatterns = [[/\?/g, "%3F"], [/#/g, "%23"]];
var urlDecodePatterns = [
	/%23/g,
	"#",
	/%24/g,
	"$",
	/%26/g,
	"&",
	/%2C/g,
	",",
	/%40/g,
	"@"
];
var parse$2 = (u) => new URL(u);
/**
* Returns resolved target URL relative to a base URL in a manner similar to that of a Web browser resolving an anchor tag HREF.
*
* @returns
*/
function resolve$2(from, to) {
	const fromUrl = new URL(convertPathToPosix(from), "https://aaa.nonexistanturl.com");
	const resolvedUrl = new URL(convertPathToPosix(to), fromUrl);
	const endSpaces = to.match(/(\s*)$/)?.[1] || "";
	if (resolvedUrl.hostname === "aaa.nonexistanturl.com") {
		const { pathname, search, hash } = resolvedUrl;
		return pathname + search + decodeURIComponent(hash) + endSpaces;
	}
	const resolved = resolvedUrl.toString() + endSpaces;
	if (resolved.includes("#")) {
		const [base, hash] = resolved.split("#", 2);
		return base + "#" + decodeURIComponent(hash || "");
	}
	return resolved;
}
/**
* Returns the current working directory (in Node) or the current page URL (in browsers).
*
* @returns
*/
function cwd() {
	if (typeof window !== "undefined" && window.location && window.location.href) {
		const href = window.location.href;
		if (!href || !href.startsWith("http")) try {
			new URL(href);
			return href;
		} catch {
			return "/";
		}
		return href;
	}
	if (typeof process !== "undefined" && process.cwd) {
		const path = process.cwd();
		const lastChar = path.slice(-1);
		if (lastChar === "/" || lastChar === "\\") return path;
		else return path + "/";
	}
	return "/";
}
/**
* Returns the protocol of the given URL, or `undefined` if it has no protocol.
*
* @param path
* @returns
*/
function getProtocol(path) {
	const match = protocolPattern.exec(path || "");
	if (match) return match[1].toLowerCase();
}
/**
* Returns the lowercased file extension of the given URL,
* or an empty string if it has no extension.
*
* @param path
* @returns
*/
function getExtension(path) {
	const lastDot = path.lastIndexOf(".");
	if (lastDot >= 0) return stripQuery(path.substring(lastDot).toLowerCase());
	return "";
}
/**
* Removes the query, if any, from the given path.
*
* @param path
* @returns
*/
function stripQuery(path) {
	const queryIndex = path.indexOf("?");
	if (queryIndex >= 0) path = path.substring(0, queryIndex);
	return path;
}
/**
* Returns the hash (URL fragment), of the given path.
* If there is no hash, then the root hash ("#") is returned.
*
* @param path
* @returns
*/
function getHash(path) {
	if (!path) return "#";
	const hashIndex = path.indexOf("#");
	if (hashIndex >= 0) return path.substring(hashIndex);
	return "#";
}
/**
* Removes the hash (URL fragment), if any, from the given path.
*
* @param path
* @returns
*/
function stripHash(path) {
	if (!path) return "";
	const hashIndex = path.indexOf("#");
	if (hashIndex >= 0) path = path.substring(0, hashIndex);
	return path;
}
/**
* Determines whether the given path is an HTTP(S) URL.
*
* @param path
* @returns
*/
function isHttp(path) {
	const protocol = getProtocol(path);
	if (protocol === "http" || protocol === "https") return true;
	else if (protocol === void 0) return typeof window !== "undefined";
	else return false;
}
/**
* Determines whether the given url is an unsafe or internal url.
*
* @param path - The URL or path to check
* @returns true if the URL is unsafe/internal, false otherwise
*/
function isUnsafeUrl(path) {
	if (!path || typeof path !== "string") return true;
	const normalizedPath = path.trim().toLowerCase();
	if (!normalizedPath) return true;
	if (normalizedPath.startsWith("javascript:") || normalizedPath.startsWith("vbscript:") || normalizedPath.startsWith("data:")) return true;
	if (normalizedPath.startsWith("file:")) return true;
	if (typeof window !== "undefined" && window.location && window.location.href) return false;
	const localPatterns = [
		"localhost",
		"127.0.0.1",
		"::1",
		"10.",
		"172.16.",
		"172.17.",
		"172.18.",
		"172.19.",
		"172.20.",
		"172.21.",
		"172.22.",
		"172.23.",
		"172.24.",
		"172.25.",
		"172.26.",
		"172.27.",
		"172.28.",
		"172.29.",
		"172.30.",
		"172.31.",
		"192.168.",
		"169.254.",
		".local",
		".internal",
		".intranet",
		".corp",
		".home",
		".lan"
	];
	try {
		const url = new URL(normalizedPath.startsWith("//") ? "http:" + normalizedPath : normalizedPath);
		const hostname = url.hostname.toLowerCase();
		for (const pattern of localPatterns) if (hostname === pattern || hostname.startsWith(pattern) || hostname.endsWith(pattern)) return true;
		if (isPrivateIP(hostname)) return true;
		const port = url.port;
		if (port && isInternalPort(parseInt(port))) return true;
	} catch {
		if (normalizedPath.startsWith("/") && !normalizedPath.startsWith("//")) return false;
		for (const pattern of localPatterns) if (normalizedPath.includes(pattern)) return true;
	}
	return false;
}
/**
* Helper function to check if an IP address is in a private range
*/
function isPrivateIP(ip) {
	const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!match) return false;
	const [, a, b, c, d] = match.map(Number);
	if (a > 255 || b > 255 || c > 255 || d > 255) return false;
	return a === 10 || a === 127 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 169 && b === 254;
}
/**
* Helper function to check if a port is typically used for internal services
*/
function isInternalPort(port) {
	return [
		22,
		23,
		25,
		53,
		135,
		139,
		445,
		993,
		995,
		1433,
		1521,
		3306,
		3389,
		5432,
		5900,
		6379,
		8080,
		8443,
		9200,
		27017
	].includes(port);
}
/**
* Determines whether the given path is a filesystem path.
* This includes "file://" URLs.
*
* @param path
* @returns
*/
function isFileSystemPath(path) {
	if (typeof window !== "undefined" || typeof process !== "undefined" && process.browser) return false;
	const protocol = getProtocol(path);
	return protocol === void 0 || protocol === "file";
}
/**
* Converts a filesystem path to a properly-encoded URL.
*
* This is intended to handle situations where JSON Schema $Ref Parser is called
* with a filesystem path that contains characters which are not allowed in URLs.
*
* @example
* The following filesystem paths would be converted to the following URLs:
*
*    <"!@#$%^&*+=?'>.json              ==>   %3C%22!@%23$%25%5E&*+=%3F\'%3E.json
*    C:\\My Documents\\File (1).json   ==>   C:/My%20Documents/File%20(1).json
*    file://Project #42/file.json      ==>   file://Project%20%2342/file.json
*
* @param path
* @returns
*/
function fromFileSystemPath(path) {
	if (isWindows()) {
		const projectDir = cwd();
		const upperPath = path.toUpperCase();
		const posixUpper = convertPathToPosix(projectDir).toUpperCase();
		const hasProjectDir = upperPath.includes(posixUpper);
		const hasProjectUri = upperPath.includes(posixUpper);
		const isAbsolutePath = isAbsoluteWin32Path.test(path) || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://");
		if (!(hasProjectDir || hasProjectUri || isAbsolutePath) && !projectDir.startsWith("http")) {
			const join = (a, b) => {
				if (a.endsWith("/") || a.endsWith("\\")) return a + b;
				else return a + "/" + b;
			};
			path = join(projectDir, path);
		}
		path = convertPathToPosix(path);
	}
	path = encodeURI(path);
	for (const pattern of urlEncodePatterns) path = path.replace(pattern[0], pattern[1]);
	return path;
}
/**
* Converts a URL to a local filesystem path.
*/
function toFileSystemPath(path, keepFileProtocol) {
	path = path.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
	path = decodeURI(path);
	for (let i = 0; i < urlDecodePatterns.length; i += 2) path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1]);
	let isFileUrl = path.toLowerCase().startsWith("file://");
	if (isFileUrl) {
		path = path.replace(/^file:\/\//, "").replace(/^\//, "");
		if (isWindows() && path[1] === "/") path = `${path[0]}:${path.substring(1)}`;
		if (keepFileProtocol) path = "file:///" + path;
		else {
			isFileUrl = false;
			path = isWindows() ? path : "/" + path;
		}
	}
	if (isWindows() && !isFileUrl) {
		path = path.replace(forwardSlashPattern, "\\");
		if (path.match(/^[a-z]:\\/i)) path = path[0].toUpperCase() + path.substring(1);
	}
	return path;
}
/**
* Converts a $ref pointer to a valid JSON Path.
*
* @param pointer
* @returns
*/
function safePointerToPath(pointer) {
	if (pointer.length <= 1 || pointer[0] !== "#" || pointer[1] !== "/") return [];
	return pointer.slice(2).split("/").map((value) => {
		return value.replace(jsonPointerSlash, "/").replace(jsonPointerTilde, "~");
	});
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/errors.js
var nonJsonTypes = [
	"function",
	"symbol",
	"undefined"
];
var protectedProps = [
	"constructor",
	"prototype",
	"__proto__"
];
var objectPrototype = Object.getPrototypeOf({});
/**
* Custom JSON serializer for Error objects.
* Returns all built-in error properties, as well as extended properties.
*/
function toJSON() {
	const pojo = {};
	const error = this;
	for (const key of getDeepKeys(error)) if (typeof key === "string") {
		const value = error[key];
		const type = typeof value;
		if (!nonJsonTypes.includes(type)) pojo[key] = value;
	}
	return pojo;
}
/**
* Returns own, inherited, enumerable, non-enumerable, string, and symbol keys of `obj`.
* Does NOT return members of the base Object prototype, or the specified omitted keys.
*/
function getDeepKeys(obj, omit = []) {
	let keys = [];
	while (obj && obj !== objectPrototype) {
		keys = keys.concat(Object.getOwnPropertyNames(obj), Object.getOwnPropertySymbols(obj));
		obj = Object.getPrototypeOf(obj);
	}
	const uniqueKeys = new Set(keys);
	for (const key of omit.concat(protectedProps)) uniqueKeys.delete(key);
	return uniqueKeys;
}
var JSONParserError = class extends Error {
	name;
	message;
	source;
	path;
	code;
	constructor(message, source) {
		super();
		this.code = "EUNKNOWN";
		this.name = "JSONParserError";
		this.message = message;
		this.source = source;
		this.path = null;
	}
	toJSON = toJSON.bind(this);
	get footprint() {
		return `${this.path}+${this.source}+${this.code}+${this.message}`;
	}
};
var JSONParserErrorGroup = class JSONParserErrorGroup extends Error {
	files;
	constructor(parser) {
		super();
		this.files = parser;
		this.name = "JSONParserErrorGroup";
		this.message = `${this.errors.length} error${this.errors.length > 1 ? "s" : ""} occurred while reading '${toFileSystemPath(parser.$refs._root$Ref.path)}'`;
	}
	toJSON = toJSON.bind(this);
	static getParserErrors(parser) {
		const errors = [];
		for (const $ref of Object.values(parser.$refs._$refs)) if ($ref.errors) errors.push(...$ref.errors);
		return errors;
	}
	get errors() {
		return JSONParserErrorGroup.getParserErrors(this.files);
	}
};
var ParserError = class extends JSONParserError {
	code = "EPARSER";
	name = "ParserError";
	constructor(message, source) {
		super(`Error parsing ${source}: ${message}`, source);
	}
};
var UnmatchedParserError = class extends JSONParserError {
	code = "EUNMATCHEDPARSER";
	name = "UnmatchedParserError";
	constructor(source) {
		super(`Could not find parser for "${source}"`, source);
	}
};
var ResolverError = class extends JSONParserError {
	code = "ERESOLVER";
	name = "ResolverError";
	ioErrorCode;
	constructor(ex, source) {
		super(ex.message || `Error reading file "${source}"`, source);
		if ("code" in ex) this.ioErrorCode = String(ex.code);
	}
};
var UnmatchedResolverError = class extends JSONParserError {
	code = "EUNMATCHEDRESOLVER";
	name = "UnmatchedResolverError";
	constructor(source) {
		super(`Could not find resolver for "${source}"`, source);
	}
};
var MissingPointerError = class extends JSONParserError {
	code = "EMISSINGPOINTER";
	name = "MissingPointerError";
	targetToken;
	targetRef;
	targetFound;
	parentPath;
	constructor(token, path, targetRef, targetFound, parentPath) {
		super(`Missing $ref pointer "${getHash(path)}". Token "${token}" does not exist.`, stripHash(path));
		this.targetToken = token;
		this.targetRef = targetRef;
		this.targetFound = targetFound;
		this.parentPath = parentPath;
	}
};
var TimeoutError = class extends JSONParserError {
	code = "ETIMEOUT";
	name = "TimeoutError";
	constructor(timeout) {
		super(`Dereferencing timeout reached: ${timeout}ms`);
	}
};
var InvalidPointerError = class extends JSONParserError {
	code = "EUNMATCHEDRESOLVER";
	name = "InvalidPointerError";
	constructor(pointer, path) {
		super(`Invalid $ref pointer "${pointer}". Pointers must begin with "#/"`, stripHash(path));
	}
};
function isHandledError(err) {
	return err instanceof JSONParserError || err instanceof JSONParserErrorGroup;
}
function normalizeError(err) {
	if (err.path === null) err.path = [];
	return err;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/schema-resources.js
function getSchemaBasePath(basePath, value) {
	const schemaId = getSchemaId(value);
	return schemaId ? resolve$2(basePath, schemaId) : basePath;
}
function usesDynamicIdScope(value) {
	if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return false;
	const schema = value.$schema;
	if (typeof schema === "string" && (schema.includes("draft/2019-09/") || schema.includes("draft/2020-12/") || schema.includes("oas/3.1/"))) return true;
	const openapi = value.openapi;
	return typeof openapi === "string" && /^3\.1(?:\.|$)/.test(openapi);
}
function registerSchemaResources($refs, basePath, value, pathType, dynamicIdScope = false) {
	if (!dynamicIdScope) return;
	const seen = /* @__PURE__ */ new Set();
	const visit = (node, scopeBase) => {
		if (!node || typeof node !== "object" || ArrayBuffer.isView(node) || seen.has(node)) return;
		seen.add(node);
		const nextScopeBase = getSchemaBasePath(scopeBase, node);
		if (nextScopeBase !== scopeBase) $refs._addAlias(nextScopeBase, node, pathType, dynamicIdScope);
		for (const key of Object.keys(node)) visit(node[key], nextScopeBase);
	};
	visit(value, basePath);
}
function getSchemaId(value) {
	if (value && typeof value === "object" && "$id" in value && typeof value.$id === "string" && value.$id.length > 0) return value.$id;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/pointer.js
var nullSymbol = Symbol("null");
var slashes = /\//g;
var tildes = /~/g;
var escapedSlash = /~1/g;
var escapedTilde = /~0/g;
/**
* This class represents a single JSON pointer and its resolved value.
*
* @param $ref
* @param path
* @param [friendlyPath] - The original user-specified path (used for error messages)
* @class
*/
var Pointer = class Pointer {
	/**
	* The {@link $Ref} object that contains this {@link Pointer} object.
	*/
	$ref;
	/**
	* The file path or URL, containing the JSON pointer in the hash.
	* This path is relative to the path of the main JSON schema file.
	*/
	path;
	/**
	* The original path or URL, used for error messages.
	*/
	originalPath;
	/**
	* The current base URI used to resolve nested $ref pointers while walking this pointer.
	*/
	scopeBase;
	/**
	* The value of the JSON pointer.
	* Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
	*/
	value;
	/**
	* Indicates whether the pointer references itself.
	*/
	circular;
	/**
	* The number of indirect references that were traversed to resolve the value.
	* Resolving a single pointer may require resolving multiple $Refs.
	*/
	indirections;
	constructor($ref, path, friendlyPath) {
		this.$ref = $ref;
		this.path = path;
		this.originalPath = friendlyPath || path;
		this.scopeBase = $ref.path || stripHash(path);
		this.value = void 0;
		this.circular = false;
		this.indirections = 0;
	}
	/**
	* Resolves the value of a nested property within the given object.
	*
	* @param obj - The object that will be crawled
	* @param options
	* @param pathFromRoot - the path of place that initiated resolving
	*
	* @returns
	* Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
	* If resolving this value required resolving other JSON references, then
	* the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
	* of the resolved value.
	*/
	resolve(obj, options, pathFromRoot) {
		const tokens = Pointer.parse(this.path, this.originalPath);
		const found = [];
		this.value = unwrapOrThrow(obj);
		if (this.$ref.dynamicIdScope && !isAliasedResource(this.$ref)) this.scopeBase = getSchemaBasePath(this.scopeBase, this.value);
		for (let i = 0; i < tokens.length; i++) {
			const wasCircular = this.circular;
			const isExtendedRef = $Ref.isExtended$Ref(this.value);
			if (resolveIf$Ref(this, options, pathFromRoot)) this.path = Pointer.join(this.path, tokens.slice(i));
			else if (!wasCircular && this.circular && isExtendedRef) this.circular = false;
			const token = tokens[i];
			if (this.value[token] === void 0 || this.value[token] === null && i === tokens.length - 1) {
				let didFindSubstringSlashMatch = false;
				for (let j = tokens.length - 1; j > i; j--) {
					const joinedToken = tokens.slice(i, j + 1).join("/");
					if (this.value[joinedToken] !== void 0) {
						this.value = this.value[joinedToken];
						i = j;
						didFindSubstringSlashMatch = true;
						break;
					}
				}
				if (didFindSubstringSlashMatch) continue;
				if (token in this.value && this.value[token] === null) {
					this.value = nullSymbol;
					continue;
				}
				this.value = null;
				const path = this.$ref.path || "";
				const targetRef = this.path.replace(path, "");
				const targetFound = Pointer.join("", found);
				const parentPath = pathFromRoot?.replace(path, "");
				throw new MissingPointerError(token, decodeURI(this.originalPath), targetRef, targetFound, parentPath);
			} else this.value = this.value[token];
			found.push(token);
			if (this.$ref.dynamicIdScope) this.scopeBase = getSchemaBasePath(this.scopeBase, this.value);
		}
		const finalResolutionBase = this.$ref.dynamicIdScope ? this.scopeBase : this.path;
		if (!this.value || this.value.$ref && resolve$2(finalResolutionBase, this.value.$ref) !== pathFromRoot) resolveIf$Ref(this, options, pathFromRoot);
		return this;
	}
	/**
	* Sets the value of a nested property within the given object.
	*
	* @param obj - The object that will be crawled
	* @param value - the value to assign
	* @param options
	*
	* @returns
	* Returns the modified object, or an entirely new object if the entire object is overwritten.
	*/
	set(obj, value, options) {
		const tokens = Pointer.parse(this.path);
		let token;
		if (tokens.length === 0) {
			this.value = value;
			return value;
		}
		this.value = unwrapOrThrow(obj);
		if (this.$ref.dynamicIdScope && !isAliasedResource(this.$ref)) this.scopeBase = getSchemaBasePath(this.scopeBase, this.value);
		for (let i = 0; i < tokens.length - 1; i++) {
			resolveIf$Ref(this, options);
			token = tokens[i];
			if (this.value && this.value[token] !== void 0) this.value = this.value[token];
			else this.value = setValue(this, token, {});
			if (this.$ref.dynamicIdScope) this.scopeBase = getSchemaBasePath(this.scopeBase, this.value);
		}
		resolveIf$Ref(this, options);
		token = tokens[tokens.length - 1];
		setValue(this, token, value);
		return obj;
	}
	/**
	* Parses a JSON pointer (or a path containing a JSON pointer in the hash)
	* and returns an array of the pointer's tokens.
	* (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
	*
	* The pointer is parsed according to RFC 6901
	* {@link https://tools.ietf.org/html/rfc6901#section-3}
	*
	* @param path
	* @param [originalPath]
	* @returns
	*/
	static parse(path, originalPath) {
		const pointer = getHash(path).substring(1);
		if (!pointer) return [];
		const split = pointer.split("/");
		for (let i = 0; i < split.length; i++) split[i] = split[i].replace(escapedSlash, "/").replace(escapedTilde, "~");
		if (split[0] !== "") throw new InvalidPointerError(pointer, originalPath === void 0 ? path : originalPath);
		return split.slice(1);
	}
	/**
	* Creates a JSON pointer path, by joining one or more tokens to a base path.
	*
	* @param base - The base path (e.g. "schema.json#/definitions/person")
	* @param tokens - The token(s) to append (e.g. ["name", "first"])
	* @returns
	*/
	static join(base, tokens) {
		if (base.indexOf("#") === -1) base += "#";
		tokens = Array.isArray(tokens) ? tokens : [tokens];
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			base += "/" + token.replace(tildes, "~0").replace(slashes, "~1");
		}
		return base;
	}
};
/**
* If the given pointer's {@link Pointer#value} is a JSON reference,
* then the reference is resolved and {@link Pointer#value} is replaced with the resolved value.
* In addition, {@link Pointer#path} and {@link Pointer#$ref} are updated to reflect the
* resolution path of the new value.
*
* @param pointer
* @param options
* @param [pathFromRoot] - the path of place that initiated resolving
* @returns - Returns `true` if the resolution path changed
*/
function resolveIf$Ref(pointer, options, pathFromRoot) {
	if ($Ref.isAllowed$Ref(pointer.value, options)) {
		const $refPath = resolve$2(pointer.$ref.dynamicIdScope ? pointer.scopeBase : pointer.path, pointer.value.$ref);
		if ($refPath === pointer.path && !isRootPath(pathFromRoot)) pointer.circular = true;
		else {
			const resolved = pointer.$ref.$refs._resolve($refPath, pointer.path, options);
			if (resolved === null) return false;
			pointer.indirections += resolved.indirections + 1;
			if ($Ref.isExtended$Ref(pointer.value)) {
				pointer.value = $Ref.dereference(pointer.value, resolved.value, options);
				return false;
			} else {
				pointer.$ref = resolved.$ref;
				pointer.path = resolved.path;
				pointer.value = resolved.value;
				pointer.scopeBase = pointer.$ref.path;
			}
			return true;
		}
	}
}
/**
* Sets the specified token value of the {@link Pointer#value}.
*
* The token is evaluated according to RFC 6901.
* {@link https://tools.ietf.org/html/rfc6901#section-4}
*
* @param pointer - The JSON Pointer whose value will be modified
* @param token - A JSON Pointer token that indicates how to modify `obj`
* @param value - The value to assign
* @returns - Returns the assigned value
*/
function setValue(pointer, token, value) {
	if (pointer.value && typeof pointer.value === "object") if (token === "-" && Array.isArray(pointer.value)) pointer.value.push(value);
	else pointer.value[token] = value;
	else throw new JSONParserError(`Error assigning $ref pointer "${pointer.path}". \nCannot set "${token}" of a non-object.`);
	return value;
}
function unwrapOrThrow(value) {
	if (isHandledError(value)) throw value;
	return value;
}
function isRootPath(pathFromRoot) {
	return typeof pathFromRoot == "string" && Pointer.parse(pathFromRoot).length == 0;
}
function isAliasedResource($ref) {
	return Boolean($ref.path && $ref.path in $ref.$refs._aliases);
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/ref.js
/**
* This class represents a single JSON reference and its resolved value.
*
* @class
*/
var $Ref = class $Ref {
	/**
	* The file path or URL of the referenced file.
	* This path is relative to the path of the main JSON schema file.
	*
	* This path does NOT contain document fragments (JSON pointers). It always references an ENTIRE file.
	* Use methods such as {@link $Ref#get}, {@link $Ref#resolve}, and {@link $Ref#exists} to get
	* specific JSON pointers within the file.
	*
	* @type {string}
	*/
	path;
	/**
	* The resolved value of the JSON reference.
	* Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
	*
	* @type {?*}
	*/
	value;
	/**
	* The {@link $Refs} object that contains this {@link $Ref} object.
	*
	* @type {$Refs}
	*/
	$refs;
	/**
	* Indicates the type of {@link $Ref#path} (e.g. "file", "http", etc.)
	*/
	pathType;
	/**
	* Whether this document/resource should use JSON Schema 2019-09+ nested $id scope semantics.
	*/
	dynamicIdScope = false;
	/**
	* List of all errors. Undefined if no errors.
	*/
	errors = [];
	constructor($refs) {
		this.$refs = $refs;
	}
	/**
	* Pushes an error to errors array.
	*
	* @param err - The error to be pushed
	* @returns
	*/
	addError(err) {
		if (this.errors === void 0) this.errors = [];
		const existingErrors = this.errors.map(({ footprint }) => footprint);
		if ("errors" in err && Array.isArray(err.errors)) this.errors.push(...err.errors.map(normalizeError).filter(({ footprint }) => !existingErrors.includes(footprint)));
		else if (!("footprint" in err) || !existingErrors.includes(err.footprint)) this.errors.push(normalizeError(err));
	}
	/**
	* Determines whether the given JSON reference exists within this {@link $Ref#value}.
	*
	* @param path - The full path being resolved, optionally with a JSON pointer in the hash
	* @param options
	* @returns
	*/
	exists(path, options) {
		try {
			this.resolve(path, options);
			return true;
		} catch {
			return false;
		}
	}
	/**
	* Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
	*
	* @param path - The full path being resolved, optionally with a JSON pointer in the hash
	* @param options
	* @returns - Returns the resolved value
	*/
	get(path, options) {
		return this.resolve(path, options)?.value;
	}
	/**
	* Resolves the given JSON reference within this {@link $Ref#value}.
	*
	* @param path - The full path being resolved, optionally with a JSON pointer in the hash
	* @param options
	* @param friendlyPath - The original user-specified path (used for error messages)
	* @param pathFromRoot - The path of `obj` from the schema root
	* @returns
	*/
	resolve(path, options, friendlyPath, pathFromRoot) {
		const pointer = new Pointer(this, path, friendlyPath);
		try {
			const resolved = pointer.resolve(this.value, options, pathFromRoot);
			if (resolved.value === nullSymbol) resolved.value = null;
			return resolved;
		} catch (err) {
			if (!options || !options.continueOnError || !isHandledError(err)) throw err;
			if (err.path === null) err.path = safePointerToPath(getHash(pathFromRoot));
			if (err instanceof InvalidPointerError) err.source = decodeURI(stripHash(pathFromRoot));
			this.addError(err);
			return null;
		}
	}
	/**
	* Sets the value of a nested property within this {@link $Ref#value}.
	* If the property, or any of its parents don't exist, they will be created.
	*
	* @param path - The full path of the property to set, optionally with a JSON pointer in the hash
	* @param value - The value to assign
	*/
	set(path, value) {
		const pointer = new Pointer(this, path);
		this.value = pointer.set(this.value, value);
		if (this.value === nullSymbol) this.value = null;
	}
	/**
	* Determines whether the given value is a JSON reference.
	*
	* @param value - The value to inspect
	* @returns
	*/
	static is$Ref(value) {
		return Boolean(value) && typeof value === "object" && value !== null && "$ref" in value && typeof value.$ref === "string" && value.$ref.length > 0;
	}
	/**
	* Determines whether the given value is an external JSON reference.
	*
	* @param value - The value to inspect
	* @returns
	*/
	static isExternal$Ref(value) {
		return $Ref.is$Ref(value) && value.$ref[0] !== "#";
	}
	/**
	* Determines whether the given value is a JSON reference, and whether it is allowed by the options.
	* For example, if it references an external file, then options.resolve.external must be true.
	*
	* @param value - The value to inspect
	* @param options
	* @returns
	*/
	static isAllowed$Ref(value, options) {
		if (this.is$Ref(value)) {
			if (value.$ref.substring(0, 2) === "#/" || value.$ref === "#") return true;
			else if (value.$ref[0] !== "#" && (!options || options.resolve?.external)) return true;
		}
	}
	/**
	* Determines whether the given value is a JSON reference that "extends" its resolved value.
	* That is, it has extra properties (in addition to "$ref"), so rather than simply pointing to
	* an existing value, this $ref actually creates a NEW value that is a shallow copy of the resolved
	* value, plus the extra properties.
	*
	* @example: {
	person: {
	properties: {
	firstName: { type: string }
	lastName: { type: string }
	}
	}
	employee: {
	properties: {
	$ref: #/person/properties
	salary: { type: number }
	}
	}
	}
	*  In this example, "employee" is an extended $ref, since it extends "person" with an additional
	*  property (salary).  The result is a NEW value that looks like this:
	*
	*  {
	*    properties: {
	*      firstName: { type: string }
	*      lastName: { type: string }
	*      salary: { type: number }
	*    }
	*  }
	*
	* @param value - The value to inspect
	* @returns
	*/
	static isExtended$Ref(value) {
		return $Ref.is$Ref(value) && Object.keys(value).length > 1;
	}
	/**
	* Returns the resolved value of a JSON Reference.
	* If necessary, the resolved value is merged with the JSON Reference to create a new object
	*
	* @example: {
	person: {
	properties: {
	firstName: { type: string }
	lastName: { type: string }
	}
	}
	employee: {
	properties: {
	$ref: #/person/properties
	salary: { type: number }
	}
	}
	} When "person" and "employee" are merged, you end up with the following object:
	*
	*  {
	*    properties: {
	*      firstName: { type: string }
	*      lastName: { type: string }
	*      salary: { type: number }
	*    }
	*  }
	*
	* @param $ref - The JSON reference object (the one with the "$ref" property)
	* @param resolvedValue - The resolved value, which can be any type
	* @param options - The options
	* @returns - Returns the dereferenced value
	*/
	static dereference($ref, resolvedValue, options) {
		if (resolvedValue && typeof resolvedValue === "object" && $Ref.isExtended$Ref($ref)) {
			const merged = {};
			for (const key of Object.keys($ref)) if (key !== "$ref") merged[key] = $ref[key];
			const mergeKeys = options?.dereference?.mergeKeys ?? true;
			for (const _key of Object.keys(resolvedValue)) {
				const key = _key;
				if (!(key in merged)) merged[key] = resolvedValue[key];
				else if (mergeKeys && typeof merged[key] === "object" && merged[key] !== null && typeof resolvedValue[key] === "object" && resolvedValue[key] !== null) merged[key] = deepMerge(resolvedValue[key], merged[key]);
			}
			return merged;
		} else return resolvedValue;
	}
};
function deepMerge(target, source) {
	if (typeof target !== "object" || target === null) return source;
	if (typeof source !== "object" || source === null) return source;
	const output = Array.isArray(target) ? [...target] : { ...target };
	for (const key of Object.keys(source)) if (Array.isArray(source[key])) output[key] = [...source[key]];
	else if (typeof source[key] === "object" && source[key] !== null) output[key] = deepMerge(target[key], source[key]);
	else output[key] = source[key];
	return output;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/refs.js
/**
* When you call the resolve method, the value that gets passed to the callback function (or Promise) is a $Refs object. This same object is accessible via the parser.$refs property of $RefParser objects.
*
* This object is a map of JSON References and their resolved values. It also has several convenient helper methods that make it easy for you to navigate and manipulate the JSON References.
*
* See https://apidevtools.com/json-schema-ref-parser/docs/refs.html
*/
var $Refs = class {
	/**
	* This property is true if the schema contains any circular references. You may want to check this property before serializing the dereferenced schema as JSON, since JSON.stringify() does not support circular references by default.
	*
	* See https://apidevtools.com/json-schema-ref-parser/docs/refs.html#circular
	*/
	circular;
	/**
	* Returns the paths/URLs of all the files in your schema (including the main schema file).
	*
	* See https://apidevtools.com/json-schema-ref-parser/docs/refs.html#pathstypes
	*
	* @param types (optional) Optionally only return certain types of paths ("file", "http", etc.)
	*/
	paths(...types) {
		return getPaths(this._$refs, types.flat()).map((path) => {
			return convertPathToPosix(path.decoded);
		});
	}
	/**
	* Returns a map of paths/URLs and their correspond values.
	*
	* See https://apidevtools.com/json-schema-ref-parser/docs/refs.html#valuestypes
	*
	* @param types (optional) Optionally only return values from certain locations ("file", "http", etc.)
	*/
	values(...types) {
		const $refs = this._$refs;
		return getPaths($refs, types.flat()).reduce((obj, path) => {
			obj[convertPathToPosix(path.decoded)] = $refs[path.encoded].value;
			return obj;
		}, {});
	}
	/**
	* Returns `true` if the given path exists in the schema; otherwise, returns `false`
	*
	* See https://apidevtools.com/json-schema-ref-parser/docs/refs.html#existsref
	*
	* @param $ref The JSON Reference path, optionally with a JSON Pointer in the hash
	*/
	/**
	* Determines whether the given JSON reference exists.
	*
	* @param path - The path being resolved, optionally with a JSON pointer in the hash
	* @param [options]
	* @returns
	*/
	exists(path, options) {
		try {
			this._resolve(path, "", options);
			return true;
		} catch {
			return false;
		}
	}
	/**
	* Resolves the given JSON reference and returns the resolved value.
	*
	* @param path - The path being resolved, with a JSON pointer in the hash
	* @param [options]
	* @returns - Returns the resolved value
	*/
	get(path, options) {
		return this._resolve(path, "", options).value;
	}
	/**
	* Sets the value at the given path in the schema. If the property, or any of its parents, don't exist, they will be created.
	*
	* @param path The JSON Reference path, optionally with a JSON Pointer in the hash
	* @param value The value to assign. Can be anything (object, string, number, etc.)
	*/
	set(path, value) {
		const absPath = resolve$2(this._root$Ref.path, path);
		const $ref = this._getRef(absPath);
		if (!$ref) throw new Error(`Error resolving $ref pointer "${path}". \n"${stripHash(absPath)}" not found.`);
		$ref.set(absPath, value);
	}
	/**
	* Returns the specified {@link $Ref} object, or undefined.
	*
	* @param path - The path being resolved, optionally with a JSON pointer in the hash
	* @returns
	* @protected
	*/
	_get$Ref(path) {
		path = resolve$2(this._root$Ref.path, path);
		return this._getRef(path);
	}
	/**
	* Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
	*
	* @param path  - The file path or URL of the referenced file
	*/
	_add(path) {
		const withoutHash = stripHash(path);
		const $ref = new $Ref(this);
		$ref.path = withoutHash;
		this._$refs[withoutHash] = $ref;
		this._root$Ref = this._root$Ref || $ref;
		return $ref;
	}
	_addAlias(path, value, pathType, dynamicIdScope = false) {
		const withoutHash = stripHash(path);
		if (!withoutHash || this._$refs[withoutHash] || this._aliases[withoutHash]) return this._$refs[withoutHash] || this._aliases[withoutHash];
		const $ref = new $Ref(this);
		$ref.path = withoutHash;
		$ref.pathType = pathType;
		$ref.value = value;
		$ref.dynamicIdScope = dynamicIdScope;
		this._aliases[withoutHash] = $ref;
		return $ref;
	}
	/**
	* Resolves the given JSON reference.
	*
	* @param path - The path being resolved, optionally with a JSON pointer in the hash
	* @param pathFromRoot - The path of `obj` from the schema root
	* @param [options]
	* @returns
	* @protected
	*/
	_resolve(path, pathFromRoot, options) {
		const absPath = resolve$2(this._root$Ref.path, path);
		const $ref = this._getRef(absPath);
		if (!$ref) throw new Error(`Error resolving $ref pointer "${path}". \n"${stripHash(absPath)}" not found.`);
		return $ref.resolve(absPath, options, path, pathFromRoot);
	}
	/**
	* A map of paths/urls to {@link $Ref} objects
	*
	* @type {object}
	* @protected
	*/
	_$refs = {};
	_aliases = {};
	/**
	* The {@link $Ref} object that is the root of the JSON schema.
	*
	* @type {$Ref}
	* @protected
	*/
	_root$Ref;
	constructor() {
		/**
		* Indicates whether the schema contains any circular references.
		*
		* @type {boolean}
		*/
		this.circular = false;
		this._$refs = {};
		this._aliases = {};
		this._root$Ref = null;
	}
	/**
	* Returns the paths of all the files/URLs that are referenced by the JSON schema,
	* including the schema itself.
	*
	* @param [types] - Only return paths of the given types ("file", "http", etc.)
	* @returns
	*/
	/**
	* Returns the map of JSON references and their resolved values.
	*
	* @param [types] - Only return references of the given types ("file", "http", etc.)
	* @returns
	*/
	/**
	* Returns a POJO (plain old JavaScript object) for serialization as JSON.
	*
	* @returns {object}
	*/
	toJSON = this.values;
	_getRef(path) {
		const withoutHash = stripHash(path);
		return this._$refs[withoutHash] || this._aliases[withoutHash];
	}
};
/**
* Returns the encoded and decoded paths keys of the given object.
*
* @param $refs - The object whose keys are URL-encoded paths
* @param [types] - Only return paths of the given types ("file", "http", etc.)
* @returns
*/
function getPaths($refs, types) {
	let paths = Object.keys($refs);
	types = Array.isArray(types[0]) ? types[0] : Array.prototype.slice.call(types);
	if (types.length > 0 && types[0]) paths = paths.filter((key) => {
		return types.includes($refs[key].pathType);
	});
	return paths.map((path) => {
		return {
			encoded: path,
			decoded: $refs[path].pathType === "file" ? toFileSystemPath(path, true) : path
		};
	});
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/plugins.js
/**
* Returns the given plugins as an array, rather than an object map.
* All other methods in this module expect an array of plugins rather than an object map.
*
* @returns
*/
function all(plugins) {
	return Object.keys(plugins || {}).filter((key) => {
		return typeof plugins[key] === "object";
	}).map((key) => {
		plugins[key].name = key;
		return plugins[key];
	});
}
/**
* Filters the given plugins, returning only the ones return `true` for the given method.
*/
function filter(plugins, method, file, callback, $refs) {
	return plugins.filter((plugin) => {
		return !!getResult(plugin, method, file, callback, $refs);
	});
}
/**
* Sorts the given plugins, in place, by their `order` property.
*/
function sort(plugins) {
	for (const plugin of plugins) plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
	return plugins.sort((a, b) => {
		return a.order - b.order;
	});
}
/**
* Runs the specified method of the given plugins, in order, until one of them returns a successful result.
* Each method can return a synchronous value, a Promise, or call an error-first callback.
* If the promise resolves successfully, or the callback is called without an error, then the result
* is immediately returned and no further plugins are called.
* If the promise rejects, or the callback is called with an error, then the next plugin is called.
* If ALL plugins fail, then the last error is thrown.
*/
async function run(plugins, method, file, $refs) {
	let plugin;
	let lastError;
	let index = 0;
	return new Promise((resolve, reject) => {
		runNextPlugin();
		function runNextPlugin() {
			plugin = plugins[index++];
			if (!plugin) return reject(lastError);
			try {
				const result = getResult(plugin, method, file, callback, $refs);
				if (result && typeof result.then === "function") result.then(onSuccess, onError);
				else if (result !== void 0) onSuccess(result);
				else if (index === plugins.length) throw new Error("No promise has been returned or callback has been called.");
			} catch (e) {
				onError(e);
			}
		}
		function callback(err, result) {
			if (err) onError(err);
			else onSuccess(result);
		}
		function onSuccess(result) {
			resolve({
				plugin,
				result
			});
		}
		function onError(error) {
			lastError = {
				plugin,
				error
			};
			runNextPlugin();
		}
	});
}
/**
* Returns the value of the given property.
* If the property is a function, then the result of the function is returned.
* If the value is a RegExp, then it will be tested against the file URL.
* If the value is an array, then it will be compared against the file extension.
*/
function getResult(obj, prop, file, callback, $refs) {
	const value = obj[prop];
	if (typeof value === "function") return value.apply(obj, [
		file,
		callback,
		$refs
	]);
	if (!callback) {
		if (value instanceof RegExp) return value.test(file.url);
		else if (typeof value === "string") return value === file.extension;
		else if (Array.isArray(value)) return value.indexOf(file.extension) !== -1;
	}
	return value;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parse.js
/**
* Reads and parses the specified file path or URL.
*/
async function parse$1(target, $refs, options) {
	let path = typeof target === "string" ? target : target.url;
	const baseUrl = typeof target === "string" ? void 0 : target.baseUrl;
	let reference = typeof target === "string" ? void 0 : target.reference;
	const hashIndex = path.indexOf("#");
	let hash = "";
	if (hashIndex >= 0) {
		hash = path.substring(hashIndex);
		path = path.substring(0, hashIndex);
	}
	if (reference) {
		const referenceHashIndex = reference.indexOf("#");
		if (referenceHashIndex >= 0) reference = reference.substring(0, referenceHashIndex);
	}
	const $ref = $refs._add(path);
	const file = {
		url: path,
		hash,
		extension: getExtension(path),
		...reference !== void 0 ? { reference } : {},
		...baseUrl !== void 0 ? { baseUrl } : {}
	};
	try {
		const resolver = await readFile$1(file, options, $refs);
		$ref.pathType = resolver.plugin.name;
		file.data = resolver.result;
		const parser = await parseFile(file, options, $refs);
		$ref.value = parser.result;
		$ref.dynamicIdScope = usesDynamicIdScope($ref.value);
		registerSchemaResources($refs, $ref.path, $ref.value, $ref.pathType, $ref.dynamicIdScope);
		return parser.result;
	} catch (err) {
		if (isHandledError(err)) $ref.value = err;
		throw err;
	}
}
/**
* Reads the given file, using the configured resolver plugins
*
* @param file           - An object containing information about the referenced file
* @param file.url       - The full URL of the referenced file
* @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
* @param options
* @param $refs
* @returns
* The promise resolves with the raw file contents and the resolver that was used.
*/
async function readFile$1(file, options, $refs) {
	let resolvers = all(options.resolve);
	resolvers = filter(resolvers, "canRead", file, void 0, $refs);
	sort(resolvers);
	try {
		return await run(resolvers, "read", file, $refs);
	} catch (err) {
		if (!err && options.continueOnError) throw new UnmatchedResolverError(file.url);
		else if (!err || !("error" in err)) throw new SyntaxError(`Unable to resolve $ref pointer "${file.url}"`, { cause: err });
		else if (err.error instanceof ResolverError) throw err.error;
		else throw new ResolverError(err, file.url);
	}
}
/**
* Parses the given file's contents, using the configured parser plugins.
*
* @param file           - An object containing information about the referenced file
* @param file.url       - The full URL of the referenced file
* @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
* @param file.data      - The file contents. This will be whatever data type was returned by the resolver
* @param options
* @param $refs
*
* @returns
* The promise resolves with the parsed file contents and the parser that was used.
*/
async function parseFile(file, options, $refs) {
	const allParsers = all(options.parse);
	const filteredParsers = filter(allParsers, "canParse", file);
	const parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;
	sort(parsers);
	try {
		const parser = await run(parsers, "parse", file, $refs);
		if (!parser.plugin.allowEmpty && isEmpty(parser.result)) throw new SyntaxError(`Error parsing "${file.url}" as ${parser.plugin.name}. \nParsed value is empty`);
		else return parser;
	} catch (err) {
		if (!err && options.continueOnError) throw new UnmatchedParserError(file.url);
		else if (err && err.message && err.message.startsWith("Error parsing")) throw err;
		else if (!err || !("error" in err)) throw new SyntaxError(`Unable to parse ${file.url}`, { cause: err });
		else if (err.error instanceof ParserError) throw err.error;
		else throw new ParserError(err.error.message, file.url);
	}
}
/**
* Determines whether the parsed value is "empty".
*
* @param value
* @returns
*/
function isEmpty(value) {
	return value === void 0 || typeof value === "object" && Object.keys(value).length === 0 || typeof value === "string" && value.trim().length === 0 || Buffer.isBuffer(value) && value.length === 0;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/json.js
var json_default = {
	/**
	* The order that this parser will run, in relation to other parsers.
	*/
	order: 100,
	/**
	* Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
	*/
	allowEmpty: true,
	/**
	* Determines whether this parser can parse a given file reference.
	* Parsers that match will be tried, in order, until one successfully parses the file.
	* Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
	* every parser will be tried.
	*/
	canParse: ".json",
	/**
	* Allow JSON files with byte order marks (BOM)
	*/
	allowBOM: true,
	/**
	* Parses the given file as JSON
	*/
	async parse(file) {
		let data = file.data;
		if (Buffer.isBuffer(data)) data = data.toString();
		if (typeof data === "string") if (data.trim().length === 0) return;
		else try {
			return JSON.parse(data);
		} catch (e) {
			if (this.allowBOM) try {
				const firstCurlyBrace = data.indexOf("{");
				data = data.slice(firstCurlyBrace);
				return JSON.parse(data);
			} catch (e) {
				throw new ParserError(e.message, file.url);
			}
			throw new ParserError(e.message, file.url);
		}
		else return data;
	}
};
//#endregion
//#region ../../node_modules/.bun/js-yaml@4.1.1/node_modules/js-yaml/dist/js-yaml.mjs
/*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT */
function isNothing(subject) {
	return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
	return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
	if (Array.isArray(sequence)) return sequence;
	else if (isNothing(sequence)) return [];
	return [sequence];
}
function extend(target, source) {
	var index, length, key, sourceKeys;
	if (source) {
		sourceKeys = Object.keys(source);
		for (index = 0, length = sourceKeys.length; index < length; index += 1) {
			key = sourceKeys[index];
			target[key] = source[key];
		}
	}
	return target;
}
function repeat(string, count) {
	var result = "", cycle;
	for (cycle = 0; cycle < count; cycle += 1) result += string;
	return result;
}
function isNegativeZero(number) {
	return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var common = {
	isNothing,
	isObject,
	toArray,
	repeat,
	isNegativeZero,
	extend
};
function formatError(exception, compact) {
	var where = "", message = exception.reason || "(unknown reason)";
	if (!exception.mark) return message;
	if (exception.mark.name) where += "in \"" + exception.mark.name + "\" ";
	where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
	if (!compact && exception.mark.snippet) where += "\n\n" + exception.mark.snippet;
	return message + " " + where;
}
function YAMLException$1(reason, mark) {
	Error.call(this);
	this.name = "YAMLException";
	this.reason = reason;
	this.mark = mark;
	this.message = formatError(this, false);
	if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	else this.stack = (/* @__PURE__ */ new Error()).stack || "";
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
	return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
	var head = "";
	var tail = "";
	var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
	if (position - lineStart > maxHalfLength) {
		head = " ... ";
		lineStart = position - maxHalfLength + head.length;
	}
	if (lineEnd - position > maxHalfLength) {
		tail = " ...";
		lineEnd = position + maxHalfLength - tail.length;
	}
	return {
		str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
		pos: position - lineStart + head.length
	};
}
function padStart(string, max) {
	return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
	options = Object.create(options || null);
	if (!mark.buffer) return null;
	if (!options.maxLength) options.maxLength = 79;
	if (typeof options.indent !== "number") options.indent = 1;
	if (typeof options.linesBefore !== "number") options.linesBefore = 3;
	if (typeof options.linesAfter !== "number") options.linesAfter = 2;
	var re = /\r?\n|\r|\0/g;
	var lineStarts = [0];
	var lineEnds = [];
	var match;
	var foundLineNo = -1;
	while (match = re.exec(mark.buffer)) {
		lineEnds.push(match.index);
		lineStarts.push(match.index + match[0].length);
		if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
	}
	if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
	var result = "", i, line;
	var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
	var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
	for (i = 1; i <= options.linesBefore; i++) {
		if (foundLineNo - i < 0) break;
		line = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
		result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
	}
	line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
	result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
	result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
	for (i = 1; i <= options.linesAfter; i++) {
		if (foundLineNo + i >= lineEnds.length) break;
		line = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
		result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
	}
	return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
	"kind",
	"multi",
	"resolve",
	"construct",
	"instanceOf",
	"predicate",
	"represent",
	"representName",
	"defaultStyle",
	"styleAliases"
];
var YAML_NODE_KINDS = [
	"scalar",
	"sequence",
	"mapping"
];
function compileStyleAliases(map) {
	var result = {};
	if (map !== null) Object.keys(map).forEach(function(style) {
		map[style].forEach(function(alias) {
			result[String(alias)] = style;
		});
	});
	return result;
}
function Type$1(tag, options) {
	options = options || {};
	Object.keys(options).forEach(function(name) {
		if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new exception("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
	});
	this.options = options;
	this.tag = tag;
	this.kind = options["kind"] || null;
	this.resolve = options["resolve"] || function() {
		return true;
	};
	this.construct = options["construct"] || function(data) {
		return data;
	};
	this.instanceOf = options["instanceOf"] || null;
	this.predicate = options["predicate"] || null;
	this.represent = options["represent"] || null;
	this.representName = options["representName"] || null;
	this.defaultStyle = options["defaultStyle"] || null;
	this.multi = options["multi"] || false;
	this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
	if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new exception("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
}
var type = Type$1;
function compileList(schema, name) {
	var result = [];
	schema[name].forEach(function(currentType) {
		var newIndex = result.length;
		result.forEach(function(previousType, previousIndex) {
			if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) newIndex = previousIndex;
		});
		result[newIndex] = currentType;
	});
	return result;
}
function compileMap() {
	var result = {
		scalar: {},
		sequence: {},
		mapping: {},
		fallback: {},
		multi: {
			scalar: [],
			sequence: [],
			mapping: [],
			fallback: []
		}
	}, index, length;
	function collectType(type) {
		if (type.multi) {
			result.multi[type.kind].push(type);
			result.multi["fallback"].push(type);
		} else result[type.kind][type.tag] = result["fallback"][type.tag] = type;
	}
	for (index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
	return result;
}
function Schema$1(definition) {
	return this.extend(definition);
}
Schema$1.prototype.extend = function extend(definition) {
	var implicit = [];
	var explicit = [];
	if (definition instanceof type) explicit.push(definition);
	else if (Array.isArray(definition)) explicit = explicit.concat(definition);
	else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
		if (definition.implicit) implicit = implicit.concat(definition.implicit);
		if (definition.explicit) explicit = explicit.concat(definition.explicit);
	} else throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
	implicit.forEach(function(type$1) {
		if (!(type$1 instanceof type)) throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		if (type$1.loadKind && type$1.loadKind !== "scalar") throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
		if (type$1.multi) throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
	});
	explicit.forEach(function(type$1) {
		if (!(type$1 instanceof type)) throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
	});
	var result = Object.create(Schema$1.prototype);
	result.implicit = (this.implicit || []).concat(implicit);
	result.explicit = (this.explicit || []).concat(explicit);
	result.compiledImplicit = compileList(result, "implicit");
	result.compiledExplicit = compileList(result, "explicit");
	result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
	return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
	kind: "scalar",
	construct: function(data) {
		return data !== null ? data : "";
	}
});
var seq = new type("tag:yaml.org,2002:seq", {
	kind: "sequence",
	construct: function(data) {
		return data !== null ? data : [];
	}
});
var map = new type("tag:yaml.org,2002:map", {
	kind: "mapping",
	construct: function(data) {
		return data !== null ? data : {};
	}
});
var failsafe = new schema({ explicit: [
	str,
	seq,
	map
] });
function resolveYamlNull(data) {
	if (data === null) return true;
	var max = data.length;
	return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
	return null;
}
function isNull(object) {
	return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
	kind: "scalar",
	resolve: resolveYamlNull,
	construct: constructYamlNull,
	predicate: isNull,
	represent: {
		canonical: function() {
			return "~";
		},
		lowercase: function() {
			return "null";
		},
		uppercase: function() {
			return "NULL";
		},
		camelcase: function() {
			return "Null";
		},
		empty: function() {
			return "";
		}
	},
	defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
	if (data === null) return false;
	var max = data.length;
	return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
	return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
	return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
	kind: "scalar",
	resolve: resolveYamlBoolean,
	construct: constructYamlBoolean,
	predicate: isBoolean,
	represent: {
		lowercase: function(object) {
			return object ? "true" : "false";
		},
		uppercase: function(object) {
			return object ? "TRUE" : "FALSE";
		},
		camelcase: function(object) {
			return object ? "True" : "False";
		}
	},
	defaultStyle: "lowercase"
});
function isHexCode(c) {
	return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
	return 48 <= c && c <= 55;
}
function isDecCode(c) {
	return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
	if (data === null) return false;
	var max = data.length, index = 0, hasDigits = false, ch;
	if (!max) return false;
	ch = data[index];
	if (ch === "-" || ch === "+") ch = data[++index];
	if (ch === "0") {
		if (index + 1 === max) return true;
		ch = data[++index];
		if (ch === "b") {
			index++;
			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (ch !== "0" && ch !== "1") return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
		if (ch === "x") {
			index++;
			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isHexCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
		if (ch === "o") {
			index++;
			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isOctCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
	}
	if (ch === "_") return false;
	for (; index < max; index++) {
		ch = data[index];
		if (ch === "_") continue;
		if (!isDecCode(data.charCodeAt(index))) return false;
		hasDigits = true;
	}
	if (!hasDigits || ch === "_") return false;
	return true;
}
function constructYamlInteger(data) {
	var value = data, sign = 1, ch;
	if (value.indexOf("_") !== -1) value = value.replace(/_/g, "");
	ch = value[0];
	if (ch === "-" || ch === "+") {
		if (ch === "-") sign = -1;
		value = value.slice(1);
		ch = value[0];
	}
	if (value === "0") return 0;
	if (ch === "0") {
		if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
		if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
		if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
	}
	return sign * parseInt(value, 10);
}
function isInteger(object) {
	return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common.isNegativeZero(object);
}
var int = new type("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: resolveYamlInteger,
	construct: constructYamlInteger,
	predicate: isInteger,
	represent: {
		binary: function(obj) {
			return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
		},
		octal: function(obj) {
			return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
		},
		decimal: function(obj) {
			return obj.toString(10);
		},
		hexadecimal: function(obj) {
			return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
		}
	},
	defaultStyle: "decimal",
	styleAliases: {
		binary: [2, "bin"],
		octal: [8, "oct"],
		decimal: [10, "dec"],
		hexadecimal: [16, "hex"]
	}
});
var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(data) {
	if (data === null) return false;
	if (!YAML_FLOAT_PATTERN.test(data) || data[data.length - 1] === "_") return false;
	return true;
}
function constructYamlFloat(data) {
	var value = data.replace(/_/g, "").toLowerCase(), sign = value[0] === "-" ? -1 : 1;
	if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
	if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
	else if (value === ".nan") return NaN;
	return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
	var res;
	if (isNaN(object)) switch (style) {
		case "lowercase": return ".nan";
		case "uppercase": return ".NAN";
		case "camelcase": return ".NaN";
	}
	else if (Number.POSITIVE_INFINITY === object) switch (style) {
		case "lowercase": return ".inf";
		case "uppercase": return ".INF";
		case "camelcase": return ".Inf";
	}
	else if (Number.NEGATIVE_INFINITY === object) switch (style) {
		case "lowercase": return "-.inf";
		case "uppercase": return "-.INF";
		case "camelcase": return "-.Inf";
	}
	else if (common.isNegativeZero(object)) return "-0.0";
	res = object.toString(10);
	return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
	return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
	kind: "scalar",
	resolve: resolveYamlFloat,
	construct: constructYamlFloat,
	predicate: isFloat,
	represent: representYamlFloat,
	defaultStyle: "lowercase"
});
var json = failsafe.extend({ implicit: [
	_null,
	bool,
	int,
	float
] });
var core = json;
var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function resolveYamlTimestamp(data) {
	if (data === null) return false;
	if (YAML_DATE_REGEXP.exec(data) !== null) return true;
	if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
	return false;
}
function constructYamlTimestamp(data) {
	var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
	match = YAML_DATE_REGEXP.exec(data);
	if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
	if (match === null) throw new Error("Date resolve error");
	year = +match[1];
	month = +match[2] - 1;
	day = +match[3];
	if (!match[4]) return new Date(Date.UTC(year, month, day));
	hour = +match[4];
	minute = +match[5];
	second = +match[6];
	if (match[7]) {
		fraction = match[7].slice(0, 3);
		while (fraction.length < 3) fraction += "0";
		fraction = +fraction;
	}
	if (match[9]) {
		tz_hour = +match[10];
		tz_minute = +(match[11] || 0);
		delta = (tz_hour * 60 + tz_minute) * 6e4;
		if (match[9] === "-") delta = -delta;
	}
	date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
	if (delta) date.setTime(date.getTime() - delta);
	return date;
}
function representYamlTimestamp(object) {
	return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
	kind: "scalar",
	resolve: resolveYamlTimestamp,
	construct: constructYamlTimestamp,
	instanceOf: Date,
	represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
	return data === "<<" || data === null;
}
var merge$1 = new type("tag:yaml.org,2002:merge", {
	kind: "scalar",
	resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
	if (data === null) return false;
	var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
	for (idx = 0; idx < max; idx++) {
		code = map.indexOf(data.charAt(idx));
		if (code > 64) continue;
		if (code < 0) return false;
		bitlen += 6;
	}
	return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
	var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
	for (idx = 0; idx < max; idx++) {
		if (idx % 4 === 0 && idx) {
			result.push(bits >> 16 & 255);
			result.push(bits >> 8 & 255);
			result.push(bits & 255);
		}
		bits = bits << 6 | map.indexOf(input.charAt(idx));
	}
	tailbits = max % 4 * 6;
	if (tailbits === 0) {
		result.push(bits >> 16 & 255);
		result.push(bits >> 8 & 255);
		result.push(bits & 255);
	} else if (tailbits === 18) {
		result.push(bits >> 10 & 255);
		result.push(bits >> 2 & 255);
	} else if (tailbits === 12) result.push(bits >> 4 & 255);
	return new Uint8Array(result);
}
function representYamlBinary(object) {
	var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
	for (idx = 0; idx < max; idx++) {
		if (idx % 3 === 0 && idx) {
			result += map[bits >> 18 & 63];
			result += map[bits >> 12 & 63];
			result += map[bits >> 6 & 63];
			result += map[bits & 63];
		}
		bits = (bits << 8) + object[idx];
	}
	tail = max % 3;
	if (tail === 0) {
		result += map[bits >> 18 & 63];
		result += map[bits >> 12 & 63];
		result += map[bits >> 6 & 63];
		result += map[bits & 63];
	} else if (tail === 2) {
		result += map[bits >> 10 & 63];
		result += map[bits >> 4 & 63];
		result += map[bits << 2 & 63];
		result += map[64];
	} else if (tail === 1) {
		result += map[bits >> 2 & 63];
		result += map[bits << 4 & 63];
		result += map[64];
		result += map[64];
	}
	return result;
}
function isBinary(obj) {
	return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
	kind: "scalar",
	resolve: resolveYamlBinary,
	construct: constructYamlBinary,
	predicate: isBinary,
	represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
	if (data === null) return true;
	var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
	for (index = 0, length = object.length; index < length; index += 1) {
		pair = object[index];
		pairHasKey = false;
		if (_toString$2.call(pair) !== "[object Object]") return false;
		for (pairKey in pair) if (_hasOwnProperty$3.call(pair, pairKey)) if (!pairHasKey) pairHasKey = true;
		else return false;
		if (!pairHasKey) return false;
		if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
		else return false;
	}
	return true;
}
function constructYamlOmap(data) {
	return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
	kind: "sequence",
	resolve: resolveYamlOmap,
	construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
	if (data === null) return true;
	var index, length, pair, keys, result, object = data;
	result = new Array(object.length);
	for (index = 0, length = object.length; index < length; index += 1) {
		pair = object[index];
		if (_toString$1.call(pair) !== "[object Object]") return false;
		keys = Object.keys(pair);
		if (keys.length !== 1) return false;
		result[index] = [keys[0], pair[keys[0]]];
	}
	return true;
}
function constructYamlPairs(data) {
	if (data === null) return [];
	var index, length, pair, keys, result, object = data;
	result = new Array(object.length);
	for (index = 0, length = object.length; index < length; index += 1) {
		pair = object[index];
		keys = Object.keys(pair);
		result[index] = [keys[0], pair[keys[0]]];
	}
	return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
	kind: "sequence",
	resolve: resolveYamlPairs,
	construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
	if (data === null) return true;
	var key, object = data;
	for (key in object) if (_hasOwnProperty$2.call(object, key)) {
		if (object[key] !== null) return false;
	}
	return true;
}
function constructYamlSet(data) {
	return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
	kind: "mapping",
	resolve: resolveYamlSet,
	construct: constructYamlSet
});
var _default = core.extend({
	implicit: [timestamp, merge$1],
	explicit: [
		binary,
		omap,
		pairs,
		set
	]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
	return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
	return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
	return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
	return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
	return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
	var lc;
	if (48 <= c && c <= 57) return c - 48;
	lc = c | 32;
	if (97 <= lc && lc <= 102) return lc - 97 + 10;
	return -1;
}
function escapedHexLen(c) {
	if (c === 120) return 2;
	if (c === 117) return 4;
	if (c === 85) return 8;
	return 0;
}
function fromDecimalCode(c) {
	if (48 <= c && c <= 57) return c - 48;
	return -1;
}
function simpleEscapeSequence(c) {
	return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? "\"" : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
	if (c <= 65535) return String.fromCharCode(c);
	return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function setProperty(object, key, value) {
	if (key === "__proto__") Object.defineProperty(object, key, {
		configurable: true,
		enumerable: true,
		writable: true,
		value
	});
	else object[key] = value;
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
	simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
	simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function State$1(input, options) {
	this.input = input;
	this.filename = options["filename"] || null;
	this.schema = options["schema"] || _default;
	this.onWarning = options["onWarning"] || null;
	this.legacy = options["legacy"] || false;
	this.json = options["json"] || false;
	this.listener = options["listener"] || null;
	this.implicitTypes = this.schema.compiledImplicit;
	this.typeMap = this.schema.compiledTypeMap;
	this.length = input.length;
	this.position = 0;
	this.line = 0;
	this.lineStart = 0;
	this.lineIndent = 0;
	this.firstTabInLine = -1;
	this.documents = [];
}
function generateError(state, message) {
	var mark = {
		name: state.filename,
		buffer: state.input.slice(0, -1),
		position: state.position,
		line: state.line,
		column: state.position - state.lineStart
	};
	mark.snippet = snippet(mark);
	return new exception(message, mark);
}
function throwError(state, message) {
	throw generateError(state, message);
}
function throwWarning(state, message) {
	if (state.onWarning) state.onWarning.call(null, generateError(state, message));
}
var directiveHandlers = {
	YAML: function handleYamlDirective(state, name, args) {
		var match, major, minor;
		if (state.version !== null) throwError(state, "duplication of %YAML directive");
		if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
		match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
		if (match === null) throwError(state, "ill-formed argument of the YAML directive");
		major = parseInt(match[1], 10);
		minor = parseInt(match[2], 10);
		if (major !== 1) throwError(state, "unacceptable YAML version of the document");
		state.version = args[0];
		state.checkLineBreaks = minor < 2;
		if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
	},
	TAG: function handleTagDirective(state, name, args) {
		var handle, prefix;
		if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
		handle = args[0];
		prefix = args[1];
		if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
		if (_hasOwnProperty$1.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
		if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
		try {
			prefix = decodeURIComponent(prefix);
		} catch (err) {
			throwError(state, "tag prefix is malformed: " + prefix);
		}
		state.tagMap[handle] = prefix;
	}
};
function captureSegment(state, start, end, checkJson) {
	var _position, _length, _character, _result;
	if (start < end) {
		_result = state.input.slice(start, end);
		if (checkJson) for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
			_character = _result.charCodeAt(_position);
			if (!(_character === 9 || 32 <= _character && _character <= 1114111)) throwError(state, "expected valid JSON character");
		}
		else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
		state.result += _result;
	}
}
function mergeMappings(state, destination, source, overridableKeys) {
	var sourceKeys, key, index, quantity;
	if (!common.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
	sourceKeys = Object.keys(source);
	for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
		key = sourceKeys[index];
		if (!_hasOwnProperty$1.call(destination, key)) {
			setProperty(destination, key, source[key]);
			overridableKeys[key] = true;
		}
	}
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
	var index, quantity;
	if (Array.isArray(keyNode)) {
		keyNode = Array.prototype.slice.call(keyNode);
		for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
			if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
			if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
		}
	}
	if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
	keyNode = String(keyNode);
	if (_result === null) _result = {};
	if (keyTag === "tag:yaml.org,2002:merge") if (Array.isArray(valueNode)) for (index = 0, quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys);
	else mergeMappings(state, _result, valueNode, overridableKeys);
	else {
		if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
			state.line = startLine || state.line;
			state.lineStart = startLineStart || state.lineStart;
			state.position = startPos || state.position;
			throwError(state, "duplicated mapping key");
		}
		setProperty(_result, keyNode, valueNode);
		delete overridableKeys[keyNode];
	}
	return _result;
}
function readLineBreak(state) {
	var ch = state.input.charCodeAt(state.position);
	if (ch === 10) state.position++;
	else if (ch === 13) {
		state.position++;
		if (state.input.charCodeAt(state.position) === 10) state.position++;
	} else throwError(state, "a line break is expected");
	state.line += 1;
	state.lineStart = state.position;
	state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
	var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
	while (ch !== 0) {
		while (is_WHITE_SPACE(ch)) {
			if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
			ch = state.input.charCodeAt(++state.position);
		}
		if (allowComments && ch === 35) do
			ch = state.input.charCodeAt(++state.position);
		while (ch !== 10 && ch !== 13 && ch !== 0);
		if (is_EOL(ch)) {
			readLineBreak(state);
			ch = state.input.charCodeAt(state.position);
			lineBreaks++;
			state.lineIndent = 0;
			while (ch === 32) {
				state.lineIndent++;
				ch = state.input.charCodeAt(++state.position);
			}
		} else break;
	}
	if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) throwWarning(state, "deficient indentation");
	return lineBreaks;
}
function testDocumentSeparator(state) {
	var _position = state.position, ch = state.input.charCodeAt(_position);
	if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
		_position += 3;
		ch = state.input.charCodeAt(_position);
		if (ch === 0 || is_WS_OR_EOL(ch)) return true;
	}
	return false;
}
function writeFoldedLines(state, count) {
	if (count === 1) state.result += " ";
	else if (count > 1) state.result += common.repeat("\n", count - 1);
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
	var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch = state.input.charCodeAt(state.position);
	if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
	if (ch === 63 || ch === 45) {
		following = state.input.charCodeAt(state.position + 1);
		if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) return false;
	}
	state.kind = "scalar";
	state.result = "";
	captureStart = captureEnd = state.position;
	hasPendingContent = false;
	while (ch !== 0) {
		if (ch === 58) {
			following = state.input.charCodeAt(state.position + 1);
			if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) break;
		} else if (ch === 35) {
			preceding = state.input.charCodeAt(state.position - 1);
			if (is_WS_OR_EOL(preceding)) break;
		} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) break;
		else if (is_EOL(ch)) {
			_line = state.line;
			_lineStart = state.lineStart;
			_lineIndent = state.lineIndent;
			skipSeparationSpace(state, false, -1);
			if (state.lineIndent >= nodeIndent) {
				hasPendingContent = true;
				ch = state.input.charCodeAt(state.position);
				continue;
			} else {
				state.position = captureEnd;
				state.line = _line;
				state.lineStart = _lineStart;
				state.lineIndent = _lineIndent;
				break;
			}
		}
		if (hasPendingContent) {
			captureSegment(state, captureStart, captureEnd, false);
			writeFoldedLines(state, state.line - _line);
			captureStart = captureEnd = state.position;
			hasPendingContent = false;
		}
		if (!is_WHITE_SPACE(ch)) captureEnd = state.position + 1;
		ch = state.input.charCodeAt(++state.position);
	}
	captureSegment(state, captureStart, captureEnd, false);
	if (state.result) return true;
	state.kind = _kind;
	state.result = _result;
	return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
	var ch = state.input.charCodeAt(state.position), captureStart, captureEnd;
	if (ch !== 39) return false;
	state.kind = "scalar";
	state.result = "";
	state.position++;
	captureStart = captureEnd = state.position;
	while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 39) {
		captureSegment(state, captureStart, state.position, true);
		ch = state.input.charCodeAt(++state.position);
		if (ch === 39) {
			captureStart = state.position;
			state.position++;
			captureEnd = state.position;
		} else return true;
	} else if (is_EOL(ch)) {
		captureSegment(state, captureStart, captureEnd, true);
		writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
		captureStart = captureEnd = state.position;
	} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
	else {
		state.position++;
		captureEnd = state.position;
	}
	throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
	var captureStart, captureEnd, hexLength, hexResult, tmp, ch = state.input.charCodeAt(state.position);
	if (ch !== 34) return false;
	state.kind = "scalar";
	state.result = "";
	state.position++;
	captureStart = captureEnd = state.position;
	while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 34) {
		captureSegment(state, captureStart, state.position, true);
		state.position++;
		return true;
	} else if (ch === 92) {
		captureSegment(state, captureStart, state.position, true);
		ch = state.input.charCodeAt(++state.position);
		if (is_EOL(ch)) skipSeparationSpace(state, false, nodeIndent);
		else if (ch < 256 && simpleEscapeCheck[ch]) {
			state.result += simpleEscapeMap[ch];
			state.position++;
		} else if ((tmp = escapedHexLen(ch)) > 0) {
			hexLength = tmp;
			hexResult = 0;
			for (; hexLength > 0; hexLength--) {
				ch = state.input.charCodeAt(++state.position);
				if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
				else throwError(state, "expected hexadecimal character");
			}
			state.result += charFromCodepoint(hexResult);
			state.position++;
		} else throwError(state, "unknown escape sequence");
		captureStart = captureEnd = state.position;
	} else if (is_EOL(ch)) {
		captureSegment(state, captureStart, captureEnd, true);
		writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
		captureStart = captureEnd = state.position;
	} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
	else {
		state.position++;
		captureEnd = state.position;
	}
	throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
	var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = Object.create(null), keyNode, keyTag, valueNode, ch = state.input.charCodeAt(state.position);
	if (ch === 91) {
		terminator = 93;
		isMapping = false;
		_result = [];
	} else if (ch === 123) {
		terminator = 125;
		isMapping = true;
		_result = {};
	} else return false;
	if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
	ch = state.input.charCodeAt(++state.position);
	while (ch !== 0) {
		skipSeparationSpace(state, true, nodeIndent);
		ch = state.input.charCodeAt(state.position);
		if (ch === terminator) {
			state.position++;
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = isMapping ? "mapping" : "sequence";
			state.result = _result;
			return true;
		} else if (!readNext) throwError(state, "missed comma between flow collection entries");
		else if (ch === 44) throwError(state, "expected the node content, but found ','");
		keyTag = keyNode = valueNode = null;
		isPair = isExplicitPair = false;
		if (ch === 63) {
			following = state.input.charCodeAt(state.position + 1);
			if (is_WS_OR_EOL(following)) {
				isPair = isExplicitPair = true;
				state.position++;
				skipSeparationSpace(state, true, nodeIndent);
			}
		}
		_line = state.line;
		_lineStart = state.lineStart;
		_pos = state.position;
		composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
		keyTag = state.tag;
		keyNode = state.result;
		skipSeparationSpace(state, true, nodeIndent);
		ch = state.input.charCodeAt(state.position);
		if ((isExplicitPair || state.line === _line) && ch === 58) {
			isPair = true;
			ch = state.input.charCodeAt(++state.position);
			skipSeparationSpace(state, true, nodeIndent);
			composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
			valueNode = state.result;
		}
		if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
		else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
		else _result.push(keyNode);
		skipSeparationSpace(state, true, nodeIndent);
		ch = state.input.charCodeAt(state.position);
		if (ch === 44) {
			readNext = true;
			ch = state.input.charCodeAt(++state.position);
		} else readNext = false;
	}
	throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
	var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch = state.input.charCodeAt(state.position);
	if (ch === 124) folding = false;
	else if (ch === 62) folding = true;
	else return false;
	state.kind = "scalar";
	state.result = "";
	while (ch !== 0) {
		ch = state.input.charCodeAt(++state.position);
		if (ch === 43 || ch === 45) if (CHOMPING_CLIP === chomping) chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
		else throwError(state, "repeat of a chomping mode identifier");
		else if ((tmp = fromDecimalCode(ch)) >= 0) if (tmp === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
		else if (!detectedIndent) {
			textIndent = nodeIndent + tmp - 1;
			detectedIndent = true;
		} else throwError(state, "repeat of an indentation width identifier");
		else break;
	}
	if (is_WHITE_SPACE(ch)) {
		do
			ch = state.input.charCodeAt(++state.position);
		while (is_WHITE_SPACE(ch));
		if (ch === 35) do
			ch = state.input.charCodeAt(++state.position);
		while (!is_EOL(ch) && ch !== 0);
	}
	while (ch !== 0) {
		readLineBreak(state);
		state.lineIndent = 0;
		ch = state.input.charCodeAt(state.position);
		while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
			state.lineIndent++;
			ch = state.input.charCodeAt(++state.position);
		}
		if (!detectedIndent && state.lineIndent > textIndent) textIndent = state.lineIndent;
		if (is_EOL(ch)) {
			emptyLines++;
			continue;
		}
		if (state.lineIndent < textIndent) {
			if (chomping === CHOMPING_KEEP) state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			else if (chomping === CHOMPING_CLIP) {
				if (didReadContent) state.result += "\n";
			}
			break;
		}
		if (folding) if (is_WHITE_SPACE(ch)) {
			atMoreIndented = true;
			state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
		} else if (atMoreIndented) {
			atMoreIndented = false;
			state.result += common.repeat("\n", emptyLines + 1);
		} else if (emptyLines === 0) {
			if (didReadContent) state.result += " ";
		} else state.result += common.repeat("\n", emptyLines);
		else state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
		didReadContent = true;
		detectedIndent = true;
		emptyLines = 0;
		captureStart = state.position;
		while (!is_EOL(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
		captureSegment(state, captureStart, state.position, false);
	}
	return true;
}
function readBlockSequence(state, nodeIndent) {
	var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
	if (state.firstTabInLine !== -1) return false;
	if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
	ch = state.input.charCodeAt(state.position);
	while (ch !== 0) {
		if (state.firstTabInLine !== -1) {
			state.position = state.firstTabInLine;
			throwError(state, "tab characters must not be used in indentation");
		}
		if (ch !== 45) break;
		following = state.input.charCodeAt(state.position + 1);
		if (!is_WS_OR_EOL(following)) break;
		detected = true;
		state.position++;
		if (skipSeparationSpace(state, true, -1)) {
			if (state.lineIndent <= nodeIndent) {
				_result.push(null);
				ch = state.input.charCodeAt(state.position);
				continue;
			}
		}
		_line = state.line;
		composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
		_result.push(state.result);
		skipSeparationSpace(state, true, -1);
		ch = state.input.charCodeAt(state.position);
		if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a sequence entry");
		else if (state.lineIndent < nodeIndent) break;
	}
	if (detected) {
		state.tag = _tag;
		state.anchor = _anchor;
		state.kind = "sequence";
		state.result = _result;
		return true;
	}
	return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
	var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
	if (state.firstTabInLine !== -1) return false;
	if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
	ch = state.input.charCodeAt(state.position);
	while (ch !== 0) {
		if (!atExplicitKey && state.firstTabInLine !== -1) {
			state.position = state.firstTabInLine;
			throwError(state, "tab characters must not be used in indentation");
		}
		following = state.input.charCodeAt(state.position + 1);
		_line = state.line;
		if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
			if (ch === 63) {
				if (atExplicitKey) {
					storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
					keyTag = keyNode = valueNode = null;
				}
				detected = true;
				atExplicitKey = true;
				allowCompact = true;
			} else if (atExplicitKey) {
				atExplicitKey = false;
				allowCompact = true;
			} else throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
			state.position += 1;
			ch = following;
		} else {
			_keyLine = state.line;
			_keyLineStart = state.lineStart;
			_keyPos = state.position;
			if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
			if (state.line === _line) {
				ch = state.input.charCodeAt(state.position);
				while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 58) {
					ch = state.input.charCodeAt(++state.position);
					if (!is_WS_OR_EOL(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
						keyTag = keyNode = valueNode = null;
					}
					detected = true;
					atExplicitKey = false;
					allowCompact = false;
					keyTag = state.tag;
					keyNode = state.result;
				} else if (detected) throwError(state, "can not read an implicit mapping pair; a colon is missed");
				else {
					state.tag = _tag;
					state.anchor = _anchor;
					return true;
				}
			} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else {
				state.tag = _tag;
				state.anchor = _anchor;
				return true;
			}
		}
		if (state.line === _line || state.lineIndent > nodeIndent) {
			if (atExplicitKey) {
				_keyLine = state.line;
				_keyLineStart = state.lineStart;
				_keyPos = state.position;
			}
			if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) if (atExplicitKey) keyNode = state.result;
			else valueNode = state.result;
			if (!atExplicitKey) {
				storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
				keyTag = keyNode = valueNode = null;
			}
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
		}
		if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
		else if (state.lineIndent < nodeIndent) break;
	}
	if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
	if (detected) {
		state.tag = _tag;
		state.anchor = _anchor;
		state.kind = "mapping";
		state.result = _result;
	}
	return detected;
}
function readTagProperty(state) {
	var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch = state.input.charCodeAt(state.position);
	if (ch !== 33) return false;
	if (state.tag !== null) throwError(state, "duplication of a tag property");
	ch = state.input.charCodeAt(++state.position);
	if (ch === 60) {
		isVerbatim = true;
		ch = state.input.charCodeAt(++state.position);
	} else if (ch === 33) {
		isNamed = true;
		tagHandle = "!!";
		ch = state.input.charCodeAt(++state.position);
	} else tagHandle = "!";
	_position = state.position;
	if (isVerbatim) {
		do
			ch = state.input.charCodeAt(++state.position);
		while (ch !== 0 && ch !== 62);
		if (state.position < state.length) {
			tagName = state.input.slice(_position, state.position);
			ch = state.input.charCodeAt(++state.position);
		} else throwError(state, "unexpected end of the stream within a verbatim tag");
	} else {
		while (ch !== 0 && !is_WS_OR_EOL(ch)) {
			if (ch === 33) if (!isNamed) {
				tagHandle = state.input.slice(_position - 1, state.position + 1);
				if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
				isNamed = true;
				_position = state.position + 1;
			} else throwError(state, "tag suffix cannot contain exclamation marks");
			ch = state.input.charCodeAt(++state.position);
		}
		tagName = state.input.slice(_position, state.position);
		if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
	}
	if (tagName && !PATTERN_TAG_URI.test(tagName)) throwError(state, "tag name cannot contain such characters: " + tagName);
	try {
		tagName = decodeURIComponent(tagName);
	} catch (err) {
		throwError(state, "tag name is malformed: " + tagName);
	}
	if (isVerbatim) state.tag = tagName;
	else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
	else if (tagHandle === "!") state.tag = "!" + tagName;
	else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
	else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
	return true;
}
function readAnchorProperty(state) {
	var _position, ch = state.input.charCodeAt(state.position);
	if (ch !== 38) return false;
	if (state.anchor !== null) throwError(state, "duplication of an anchor property");
	ch = state.input.charCodeAt(++state.position);
	_position = state.position;
	while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
	if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
	state.anchor = state.input.slice(_position, state.position);
	return true;
}
function readAlias(state) {
	var _position, alias, ch = state.input.charCodeAt(state.position);
	if (ch !== 42) return false;
	ch = state.input.charCodeAt(++state.position);
	_position = state.position;
	while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
	if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
	alias = state.input.slice(_position, state.position);
	if (!_hasOwnProperty$1.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
	state.result = state.anchorMap[alias];
	skipSeparationSpace(state, true, -1);
	return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
	var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
	if (state.listener !== null) state.listener("open", state);
	state.tag = null;
	state.anchor = null;
	state.kind = null;
	state.result = null;
	allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
	if (allowToSeek) {
		if (skipSeparationSpace(state, true, -1)) {
			atNewLine = true;
			if (state.lineIndent > parentIndent) indentStatus = 1;
			else if (state.lineIndent === parentIndent) indentStatus = 0;
			else if (state.lineIndent < parentIndent) indentStatus = -1;
		}
	}
	if (indentStatus === 1) while (readTagProperty(state) || readAnchorProperty(state)) if (skipSeparationSpace(state, true, -1)) {
		atNewLine = true;
		allowBlockCollections = allowBlockStyles;
		if (state.lineIndent > parentIndent) indentStatus = 1;
		else if (state.lineIndent === parentIndent) indentStatus = 0;
		else if (state.lineIndent < parentIndent) indentStatus = -1;
	} else allowBlockCollections = false;
	if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
	if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
		if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
		else flowIndent = parentIndent + 1;
		blockIndent = state.position - state.lineStart;
		if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
		else {
			if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
			else if (readAlias(state)) {
				hasContent = true;
				if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
			} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
				hasContent = true;
				if (state.tag === null) state.tag = "?";
			}
			if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
		}
		else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
	}
	if (state.tag === null) {
		if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
	} else if (state.tag === "?") {
		if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
		for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
			type = state.implicitTypes[typeIndex];
			if (type.resolve(state.result)) {
				state.result = type.construct(state.result);
				state.tag = type.tag;
				if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
				break;
			}
		}
	} else if (state.tag !== "!") {
		if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) type = state.typeMap[state.kind || "fallback"][state.tag];
		else {
			type = null;
			typeList = state.typeMap.multi[state.kind || "fallback"];
			for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
				type = typeList[typeIndex];
				break;
			}
		}
		if (!type) throwError(state, "unknown tag !<" + state.tag + ">");
		if (state.result !== null && type.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type.kind + "\", not \"" + state.kind + "\"");
		if (!type.resolve(state.result, state.tag)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
		else {
			state.result = type.construct(state.result, state.tag);
			if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
		}
	}
	if (state.listener !== null) state.listener("close", state);
	return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
	var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
	state.version = null;
	state.checkLineBreaks = state.legacy;
	state.tagMap = Object.create(null);
	state.anchorMap = Object.create(null);
	while ((ch = state.input.charCodeAt(state.position)) !== 0) {
		skipSeparationSpace(state, true, -1);
		ch = state.input.charCodeAt(state.position);
		if (state.lineIndent > 0 || ch !== 37) break;
		hasDirectives = true;
		ch = state.input.charCodeAt(++state.position);
		_position = state.position;
		while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
		directiveName = state.input.slice(_position, state.position);
		directiveArgs = [];
		if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
		while (ch !== 0) {
			while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
			if (ch === 35) {
				do
					ch = state.input.charCodeAt(++state.position);
				while (ch !== 0 && !is_EOL(ch));
				break;
			}
			if (is_EOL(ch)) break;
			_position = state.position;
			while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
			directiveArgs.push(state.input.slice(_position, state.position));
		}
		if (ch !== 0) readLineBreak(state);
		if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) directiveHandlers[directiveName](state, directiveName, directiveArgs);
		else throwWarning(state, "unknown document directive \"" + directiveName + "\"");
	}
	skipSeparationSpace(state, true, -1);
	if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
		state.position += 3;
		skipSeparationSpace(state, true, -1);
	} else if (hasDirectives) throwError(state, "directives end mark is expected");
	composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
	skipSeparationSpace(state, true, -1);
	if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) throwWarning(state, "non-ASCII line breaks are interpreted as content");
	state.documents.push(state.result);
	if (state.position === state.lineStart && testDocumentSeparator(state)) {
		if (state.input.charCodeAt(state.position) === 46) {
			state.position += 3;
			skipSeparationSpace(state, true, -1);
		}
		return;
	}
	if (state.position < state.length - 1) throwError(state, "end of the stream or a document separator is expected");
	else return;
}
function loadDocuments(input, options) {
	input = String(input);
	options = options || {};
	if (input.length !== 0) {
		if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
		if (input.charCodeAt(0) === 65279) input = input.slice(1);
	}
	var state = new State$1(input, options);
	var nullpos = input.indexOf("\0");
	if (nullpos !== -1) {
		state.position = nullpos;
		throwError(state, "null byte is not allowed in input");
	}
	state.input += "\0";
	while (state.input.charCodeAt(state.position) === 32) {
		state.lineIndent += 1;
		state.position += 1;
	}
	while (state.position < state.length - 1) readDocument(state);
	return state.documents;
}
function loadAll$1(input, iterator, options) {
	if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
		options = iterator;
		iterator = null;
	}
	var documents = loadDocuments(input, options);
	if (typeof iterator !== "function") return documents;
	for (var index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
}
function load$1(input, options) {
	var documents = loadDocuments(input, options);
	if (documents.length === 0) return;
	else if (documents.length === 1) return documents[0];
	throw new exception("expected a single document in the stream, but found more");
}
var loader = {
	loadAll: loadAll$1,
	load: load$1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = "\\\"";
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
	"y",
	"Y",
	"yes",
	"Yes",
	"YES",
	"on",
	"On",
	"ON",
	"n",
	"N",
	"no",
	"No",
	"NO",
	"off",
	"Off",
	"OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema, map) {
	var result, keys, index, length, tag, style, type;
	if (map === null) return {};
	result = {};
	keys = Object.keys(map);
	for (index = 0, length = keys.length; index < length; index += 1) {
		tag = keys[index];
		style = String(map[tag]);
		if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
		type = schema.compiledTypeMap["fallback"][tag];
		if (type && _hasOwnProperty.call(type.styleAliases, style)) style = type.styleAliases[style];
		result[tag] = style;
	}
	return result;
}
function encodeHex(character) {
	var string = character.toString(16).toUpperCase(), handle, length;
	if (character <= 255) {
		handle = "x";
		length = 2;
	} else if (character <= 65535) {
		handle = "u";
		length = 4;
	} else if (character <= 4294967295) {
		handle = "U";
		length = 8;
	} else throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
	return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1, QUOTING_TYPE_DOUBLE = 2;
function State(options) {
	this.schema = options["schema"] || _default;
	this.indent = Math.max(1, options["indent"] || 2);
	this.noArrayIndent = options["noArrayIndent"] || false;
	this.skipInvalid = options["skipInvalid"] || false;
	this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
	this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
	this.sortKeys = options["sortKeys"] || false;
	this.lineWidth = options["lineWidth"] || 80;
	this.noRefs = options["noRefs"] || false;
	this.noCompatMode = options["noCompatMode"] || false;
	this.condenseFlow = options["condenseFlow"] || false;
	this.quotingType = options["quotingType"] === "\"" ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
	this.forceQuotes = options["forceQuotes"] || false;
	this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
	this.implicitTypes = this.schema.compiledImplicit;
	this.explicitTypes = this.schema.compiledExplicit;
	this.tag = null;
	this.result = "";
	this.duplicates = [];
	this.usedDuplicates = null;
}
function indentString(string, spaces) {
	var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
	while (position < length) {
		next = string.indexOf("\n", position);
		if (next === -1) {
			line = string.slice(position);
			position = length;
		} else {
			line = string.slice(position, next + 1);
			position = next + 1;
		}
		if (line.length && line !== "\n") result += ind;
		result += line;
	}
	return result;
}
function generateNextLine(state, level) {
	return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str) {
	var index, length, type;
	for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
		type = state.implicitTypes[index];
		if (type.resolve(str)) return true;
	}
	return false;
}
function isWhitespace(c) {
	return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
	return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
	return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
	var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
	var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
	return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
}
function isPlainSafeFirst(c) {
	return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
	return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
	var first = string.charCodeAt(pos), second;
	if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
		second = string.charCodeAt(pos + 1);
		if (second >= 56320 && second <= 57343) return (first - 55296) * 1024 + second - 56320 + 65536;
	}
	return first;
}
function needIndentIndicator(string) {
	return /^\n* /.test(string);
}
var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
	var i;
	var char = 0;
	var prevChar = null;
	var hasLineBreak = false;
	var hasFoldableLine = false;
	var shouldTrackWidth = lineWidth !== -1;
	var previousLineBreak = -1;
	var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
	if (singleLineOnly || forceQuotes) for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
		char = codePointAt(string, i);
		if (!isPrintable(char)) return STYLE_DOUBLE;
		plain = plain && isPlainSafe(char, prevChar, inblock);
		prevChar = char;
	}
	else {
		for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
			char = codePointAt(string, i);
			if (char === CHAR_LINE_FEED) {
				hasLineBreak = true;
				if (shouldTrackWidth) {
					hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
					previousLineBreak = i;
				}
			} else if (!isPrintable(char)) return STYLE_DOUBLE;
			plain = plain && isPlainSafe(char, prevChar, inblock);
			prevChar = char;
		}
		hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
	}
	if (!hasLineBreak && !hasFoldableLine) {
		if (plain && !forceQuotes && !testAmbiguousType(string)) return STYLE_PLAIN;
		return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
	}
	if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
	if (!forceQuotes) return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
	return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
	state.dump = function() {
		if (string.length === 0) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"\"" : "''";
		if (!state.noCompatMode) {
			if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"" + string + "\"" : "'" + string + "'";
		}
		var indent = state.indent * Math.max(1, level);
		var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
		var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
		function testAmbiguity(string) {
			return testImplicitResolving(state, string);
		}
		switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
			case STYLE_PLAIN: return string;
			case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
			case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
			case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
			case STYLE_DOUBLE: return "\"" + escapeString(string) + "\"";
			default: throw new exception("impossible error: invalid scalar style");
		}
	}();
}
function blockHeader(string, indentPerLevel) {
	var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
	var clip = string[string.length - 1] === "\n";
	return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
}
function dropEndingNewline(string) {
	return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
	var lineRe = /(\n+)([^\n]*)/g;
	var result = function() {
		var nextLF = string.indexOf("\n");
		nextLF = nextLF !== -1 ? nextLF : string.length;
		lineRe.lastIndex = nextLF;
		return foldLine(string.slice(0, nextLF), width);
	}();
	var prevMoreIndented = string[0] === "\n" || string[0] === " ";
	var moreIndented;
	var match;
	while (match = lineRe.exec(string)) {
		var prefix = match[1], line = match[2];
		moreIndented = line[0] === " ";
		result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
		prevMoreIndented = moreIndented;
	}
	return result;
}
function foldLine(line, width) {
	if (line === "" || line[0] === " ") return line;
	var breakRe = / [^ ]/g;
	var match;
	var start = 0, end, curr = 0, next = 0;
	var result = "";
	while (match = breakRe.exec(line)) {
		next = match.index;
		if (next - start > width) {
			end = curr > start ? curr : next;
			result += "\n" + line.slice(start, end);
			start = end + 1;
		}
		curr = next;
	}
	result += "\n";
	if (line.length - start > width && curr > start) result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
	else result += line.slice(start);
	return result.slice(1);
}
function escapeString(string) {
	var result = "";
	var char = 0;
	var escapeSeq;
	for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
		char = codePointAt(string, i);
		escapeSeq = ESCAPE_SEQUENCES[char];
		if (!escapeSeq && isPrintable(char)) {
			result += string[i];
			if (char >= 65536) result += string[i + 1];
		} else result += escapeSeq || encodeHex(char);
	}
	return result;
}
function writeFlowSequence(state, level, object) {
	var _result = "", _tag = state.tag, index, length, value;
	for (index = 0, length = object.length; index < length; index += 1) {
		value = object[index];
		if (state.replacer) value = state.replacer.call(object, String(index), value);
		if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
			if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
			_result += state.dump;
		}
	}
	state.tag = _tag;
	state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
	var _result = "", _tag = state.tag, index, length, value;
	for (index = 0, length = object.length; index < length; index += 1) {
		value = object[index];
		if (state.replacer) value = state.replacer.call(object, String(index), value);
		if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
			if (!compact || _result !== "") _result += generateNextLine(state, level);
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
			else _result += "- ";
			_result += state.dump;
		}
	}
	state.tag = _tag;
	state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
	var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
	for (index = 0, length = objectKeyList.length; index < length; index += 1) {
		pairBuffer = "";
		if (_result !== "") pairBuffer += ", ";
		if (state.condenseFlow) pairBuffer += "\"";
		objectKey = objectKeyList[index];
		objectValue = object[objectKey];
		if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
		if (!writeNode(state, level, objectKey, false, false)) continue;
		if (state.dump.length > 1024) pairBuffer += "? ";
		pairBuffer += state.dump + (state.condenseFlow ? "\"" : "") + ":" + (state.condenseFlow ? "" : " ");
		if (!writeNode(state, level, objectValue, false, false)) continue;
		pairBuffer += state.dump;
		_result += pairBuffer;
	}
	state.tag = _tag;
	state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
	var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
	if (state.sortKeys === true) objectKeyList.sort();
	else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
	else if (state.sortKeys) throw new exception("sortKeys must be a boolean or a function");
	for (index = 0, length = objectKeyList.length; index < length; index += 1) {
		pairBuffer = "";
		if (!compact || _result !== "") pairBuffer += generateNextLine(state, level);
		objectKey = objectKeyList[index];
		objectValue = object[objectKey];
		if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
		if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
		explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
		if (explicitPair) if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += "?";
		else pairBuffer += "? ";
		pairBuffer += state.dump;
		if (explicitPair) pairBuffer += generateNextLine(state, level);
		if (!writeNode(state, level + 1, objectValue, true, explicitPair)) continue;
		if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += ":";
		else pairBuffer += ": ";
		pairBuffer += state.dump;
		_result += pairBuffer;
	}
	state.tag = _tag;
	state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
	var _result, typeList = explicit ? state.explicitTypes : state.implicitTypes, index, length, type, style;
	for (index = 0, length = typeList.length; index < length; index += 1) {
		type = typeList[index];
		if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
			if (explicit) if (type.multi && type.representName) state.tag = type.representName(object);
			else state.tag = type.tag;
			else state.tag = "?";
			if (type.represent) {
				style = state.styleMap[type.tag] || type.defaultStyle;
				if (_toString.call(type.represent) === "[object Function]") _result = type.represent(object, style);
				else if (_hasOwnProperty.call(type.represent, style)) _result = type.represent[style](object, style);
				else throw new exception("!<" + type.tag + "> tag resolver accepts not \"" + style + "\" style");
				state.dump = _result;
			}
			return true;
		}
	}
	return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
	state.tag = null;
	state.dump = object;
	if (!detectType(state, object, false)) detectType(state, object, true);
	var type = _toString.call(state.dump);
	var inblock = block;
	var tagStr;
	if (block) block = state.flowLevel < 0 || state.flowLevel > level;
	var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
	if (objectOrArray) {
		duplicateIndex = state.duplicates.indexOf(object);
		duplicate = duplicateIndex !== -1;
	}
	if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
	if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
	else {
		if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
		if (type === "[object Object]") if (block && Object.keys(state.dump).length !== 0) {
			writeBlockMapping(state, level, state.dump, compact);
			if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
		} else {
			writeFlowMapping(state, level, state.dump);
			if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
		}
		else if (type === "[object Array]") if (block && state.dump.length !== 0) {
			if (state.noArrayIndent && !isblockseq && level > 0) writeBlockSequence(state, level - 1, state.dump, compact);
			else writeBlockSequence(state, level, state.dump, compact);
			if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
		} else {
			writeFlowSequence(state, level, state.dump);
			if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
		}
		else if (type === "[object String]") {
			if (state.tag !== "?") writeScalar(state, state.dump, level, iskey, inblock);
		} else if (type === "[object Undefined]") return false;
		else {
			if (state.skipInvalid) return false;
			throw new exception("unacceptable kind of an object to dump " + type);
		}
		if (state.tag !== null && state.tag !== "?") {
			tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
			if (state.tag[0] === "!") tagStr = "!" + tagStr;
			else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") tagStr = "!!" + tagStr.slice(18);
			else tagStr = "!<" + tagStr + ">";
			state.dump = tagStr + " " + state.dump;
		}
	}
	return true;
}
function getDuplicateReferences(object, state) {
	var objects = [], duplicatesIndexes = [], index, length;
	inspectNode(object, objects, duplicatesIndexes);
	for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
	state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
	var objectKeyList, index, length;
	if (object !== null && typeof object === "object") {
		index = objects.indexOf(object);
		if (index !== -1) {
			if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
		} else {
			objects.push(object);
			if (Array.isArray(object)) for (index = 0, length = object.length; index < length; index += 1) inspectNode(object[index], objects, duplicatesIndexes);
			else {
				objectKeyList = Object.keys(object);
				for (index = 0, length = objectKeyList.length; index < length; index += 1) inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
			}
		}
	}
}
function dump$1(input, options) {
	options = options || {};
	var state = new State(options);
	if (!state.noRefs) getDuplicateReferences(input, state);
	var value = input;
	if (state.replacer) value = state.replacer.call({ "": value }, "", value);
	if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
	return "";
}
var dumper = { dump: dump$1 };
function renamed(from, to) {
	return function() {
		throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
	};
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var jsYaml = {
	Type,
	Schema,
	FAILSAFE_SCHEMA,
	JSON_SCHEMA,
	CORE_SCHEMA: core,
	DEFAULT_SCHEMA: _default,
	load: loader.load,
	loadAll: loader.loadAll,
	dump: dumper.dump,
	YAMLException: exception,
	types: {
		binary,
		float,
		map,
		null: _null,
		pairs,
		set,
		timestamp,
		bool,
		int,
		merge: merge$1,
		omap,
		seq,
		str
	},
	safeLoad: renamed("safeLoad", "load"),
	safeLoadAll: renamed("safeLoadAll", "loadAll"),
	safeDump: renamed("safeDump", "dump")
};
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/yaml.js
var yaml_default = {
	/**
	* The order that this parser will run, in relation to other parsers.
	*/
	order: 200,
	/**
	* Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
	*/
	allowEmpty: true,
	/**
	* Determines whether this parser can parse a given file reference.
	* Parsers that match will be tried, in order, until one successfully parses the file.
	* Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
	* every parser will be tried.
	*/
	canParse: [
		".yaml",
		".yml",
		".json"
	],
	/**
	* Parses the given file as YAML
	*
	* @param file           - An object containing information about the referenced file
	* @param file.url       - The full URL of the referenced file
	* @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
	* @param file.data      - The file contents. This will be whatever data type was returned by the resolver
	* @returns
	*/
	async parse(file) {
		let data = file.data;
		if (Buffer.isBuffer(data)) data = data.toString();
		if (typeof data === "string") try {
			return jsYaml.load(data, { schema: JSON_SCHEMA });
		} catch {
			try {
				return jsYaml.load(data);
			} catch (e) {
				throw new ParserError(e?.message || "Parser Error", file.url);
			}
		}
		else return data;
	}
};
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/text.js
var TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;
var text_default = {
	/**
	* The order that this parser will run, in relation to other parsers.
	*/
	order: 300,
	/**
	* Whether to allow "empty" files (zero bytes).
	*/
	allowEmpty: true,
	/**
	* The encoding that the text is expected to be in.
	*/
	encoding: "utf8",
	/**
	* Determines whether this parser can parse a given file reference.
	* Parsers that return true will be tried, in order, until one successfully parses the file.
	* Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
	* every parser will be tried.
	*/
	canParse(file) {
		return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
	},
	/**
	* Parses the given file as text
	*/
	parse(file) {
		if (typeof file.data === "string") return file.data;
		else if (Buffer.isBuffer(file.data)) return file.data.toString(this.encoding);
		else throw new ParserError("data is not text", file.url);
	}
};
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/binary.js
var BINARY_REGEXP = /\.(jpeg|jpg|gif|png|bmp|ico)$/i;
var binary_default = {
	/**
	* The order that this parser will run, in relation to other parsers.
	*/
	order: 400,
	/**
	* Whether to allow "empty" files (zero bytes).
	*/
	allowEmpty: true,
	/**
	* Determines whether this parser can parse a given file reference.
	* Parsers that return true will be tried, in order, until one successfully parses the file.
	* Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
	* every parser will be tried.
	*/
	canParse(file) {
		return Buffer.isBuffer(file.data) && BINARY_REGEXP.test(file.url);
	},
	/**
	* Parses the given data as a Buffer (byte array).
	*/
	parse(file) {
		if (Buffer.isBuffer(file.data)) return file.data;
		else return Buffer.from(file.data);
	}
};
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/file.js
var file_default = {
	/**
	* The order that this resolver will run, in relation to other resolvers.
	*/
	order: 100,
	/**
	* Determines whether this resolver can read a given file reference.
	* Resolvers that return true will be tried, in order, until one successfully resolves the file.
	* Resolvers that return false will not be given a chance to resolve the file.
	*/
	canRead(file) {
		return isFileSystemPath(file.url);
	},
	/**
	* Reads the given file and returns its raw contents as a Buffer.
	*/
	async read(file) {
		let path;
		const fs = await import("fs");
		try {
			path = toFileSystemPath(file.url);
		} catch (err) {
			const e = err;
			e.message = `Malformed URI: ${file.url}: ${e.message}`;
			throw new ResolverError(e, file.url);
		}
		if (path.endsWith("/") || path.endsWith("\\")) path = path.slice(0, -1);
		try {
			return await fs.promises.readFile(path);
		} catch (err) {
			const e = err;
			e.message = `Error opening file ${path}: ${e.message}`;
			throw new ResolverError(e, path);
		}
	}
};
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/http.js
var http_default = {
	/**
	* The order that this resolver will run, in relation to other resolvers.
	*/
	order: 200,
	/**
	* HTTP headers to send when downloading files.
	*
	* @example:
	* {
	*   "User-Agent": "JSON Schema $Ref Parser",
	*   Accept: "application/json"
	* }
	*/
	headers: null,
	/**
	* HTTP request timeout (in milliseconds).
	*/
	timeout: 6e4,
	/**
	* The maximum number of HTTP redirects to follow.
	* To disable automatic following of redirects, set this to zero.
	*/
	redirects: 5,
	/**
	* The `withCredentials` option of XMLHttpRequest.
	* Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
	*/
	withCredentials: false,
	/**
	* Set this to `false` if you want to allow unsafe URLs (e.g., `127.0.0.1`, localhost, and other internal URLs).
	*/
	safeUrlResolver: true,
	/**
	* Determines whether this resolver can read a given file reference.
	* Resolvers that return true will be tried in order, until one successfully resolves the file.
	* Resolvers that return false will not be given a chance to resolve the file.
	*/
	canRead(file) {
		return isHttp(file.url) && (!this.safeUrlResolver || !isUnsafeUrl(file.url));
	},
	/**
	* Reads the given URL and returns its raw contents as a Buffer.
	*/
	read(file) {
		const u = parse$2(file.url);
		if (typeof window !== "undefined" && !u.protocol) u.protocol = parse$2(location.href).protocol;
		return download(u, this);
	}
};
/**
* Downloads the given file.
* @returns
* The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
*/
async function download(u, httpOptions, _redirects) {
	u = parse$2(u);
	const redirects = _redirects || [];
	redirects.push(u.href);
	try {
		const res = await get(u, httpOptions);
		if (res.status >= 400) {
			const error = /* @__PURE__ */ new Error(`HTTP ERROR ${res.status}`);
			error.status = res.status;
			throw error;
		} else if (res.status >= 300) if (!Number.isNaN(httpOptions.redirects) && redirects.length > httpOptions.redirects) {
			const error = /* @__PURE__ */ new Error(`Error downloading ${redirects[0]}. \nToo many redirects: \n  ${redirects.join(" \n  ")}`);
			error.status = res.status;
			throw new ResolverError(error);
		} else if (!("location" in res.headers) || !res.headers.location) {
			const error = /* @__PURE__ */ new Error(`HTTP ${res.status} redirect with no location header`);
			error.status = res.status;
			throw error;
		} else return download(resolve$2(u.href, res.headers.location), httpOptions, redirects);
		else {
			if (res.body) {
				const buf = await res.arrayBuffer();
				return Buffer.from(buf);
			}
			return Buffer.alloc(0);
		}
	} catch (err) {
		const e = err;
		e.message = `Error downloading ${u.href}: ${e.message}`;
		throw new ResolverError(e, u.href);
	}
}
/**
* Sends an HTTP GET request.
* The promise resolves with the HTTP Response object.
*/
async function get(u, httpOptions) {
	let controller;
	let timeoutId;
	if (httpOptions.timeout && typeof AbortController !== "undefined") {
		controller = new AbortController();
		timeoutId = setTimeout(() => controller.abort(), httpOptions.timeout);
	}
	const response = await fetch(u, {
		method: "GET",
		headers: httpOptions.headers || {},
		credentials: httpOptions.withCredentials ? "include" : "same-origin",
		signal: controller ? controller.signal : null
	});
	if (timeoutId) clearTimeout(timeoutId);
	return response;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/options.js
var getJsonSchemaRefParserDefaultOptions = () => {
	return {
		/**
		* Determines how different types of files will be parsed.
		*
		* You can add additional parsers of your own, replace an existing one with
		* your own implementation, or disable any parser by setting it to false.
		*/
		parse: {
			json: { ...json_default },
			yaml: { ...yaml_default },
			text: { ...text_default },
			binary: { ...binary_default }
		},
		/**
		* Determines how JSON References will be resolved.
		*
		* You can add additional resolvers of your own, replace an existing one with
		* your own implementation, or disable any resolver by setting it to false.
		*/
		resolve: {
			file: { ...file_default },
			http: { ...http_default },
			/**
			* Determines whether external $ref pointers will be resolved.
			* If this option is disabled, then none of above resolvers will be called.
			* Instead, external $ref pointers will simply be ignored.
			*
			* @type {boolean}
			*/
			external: true
		},
		/**
		* By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
		* causes it to keep processing as much as possible and then throw a single error that contains all errors
		* that were encountered.
		*/
		continueOnError: false,
		/**
		* Determines the types of JSON references that are allowed.
		*/
		bundle: { 
		/**
		* A function, called for each path, which can return true to stop this path and all
		* subpaths from being processed further. This is useful in schemas where some
		* subpaths contain literal $ref keys that should not be changed.
		*
		* @type {function}
		*/
excludedPathMatcher: () => false },
		/**
		* Determines the types of JSON references that are allowed.
		*/
		dereference: {
			/**
			* Dereference circular (recursive) JSON references?
			* If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
			* If "ignore", then circular references will not be dereferenced.
			*
			* @type {boolean|string}
			*/
			circular: true,
			/**
			* A function, called for each path, which can return true to stop this path and all
			* subpaths from being dereferenced further. This is useful in schemas where some
			* subpaths contain literal $ref keys that should not be dereferenced.
			*
			* @type {function}
			*/
			excludedPathMatcher: () => false,
			referenceResolution: "relative",
			mergeKeys: true
		},
		mutateInputSchema: true
	};
};
var getNewOptions = (options) => {
	const newOptions = getJsonSchemaRefParserDefaultOptions();
	if (options) merge(newOptions, options);
	return newOptions;
};
/**
* Merges the properties of the source object into the target object.
*
* @param target - The object that we're populating
* @param source - The options that are being merged
* @returns
*/
function merge(target, source) {
	if (isMergeable(source)) {
		const keys = Object.keys(source).filter((key) => ![
			"__proto__",
			"constructor",
			"prototype"
		].includes(key));
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const sourceSetting = source[key];
			const targetSetting = target[key];
			if (isMergeable(sourceSetting)) target[key] = merge(targetSetting || {}, sourceSetting);
			else if (sourceSetting !== void 0) target[key] = sourceSetting;
		}
	}
	return target;
}
/**
* Determines whether the given value can be merged,
* or if it is a scalar value that should just override the target value.
*
* @param val
* @returns
*/
function isMergeable(val) {
	return val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date);
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/normalize-args.js
/**
* Normalizes the given arguments, accounting for optional args.
*/
function normalizeArgs(_args) {
	let path;
	let schema;
	let options;
	let callback;
	const args = Array.prototype.slice.call(_args);
	if (typeof args[args.length - 1] === "function") callback = args.pop();
	if (typeof args[0] === "string") {
		path = args[0];
		if (typeof args[2] === "object") {
			schema = args[1];
			options = args[2];
		} else {
			schema = void 0;
			options = args[1];
		}
	} else {
		path = "";
		schema = args[0];
		options = args[1];
	}
	try {
		options = getNewOptions(options);
	} catch (e) {
		console.error(`JSON Schema Ref Parser: Error normalizing options: ${e}`);
	}
	if (!options.mutateInputSchema && typeof schema === "object") schema = JSON.parse(JSON.stringify(schema));
	return {
		path,
		schema,
		options,
		callback
	};
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolve-external.js
/**
* Crawls the JSON schema, finds all external JSON references, and resolves their values.
* This method does not mutate the JSON schema. The resolved values are added to {@link $RefParser#$refs}.
*
* NOTE: We only care about EXTERNAL references here. INTERNAL references are only relevant when dereferencing.
*
* @returns
* The promise resolves once all JSON references in the schema have been resolved,
* including nested references that are contained in externally-referenced files.
*/
function resolveExternal(parser, options) {
	if (!options.resolve?.external) return Promise.resolve();
	try {
		const rootScopeBase = parser.$refs._root$Ref.dynamicIdScope ? getSchemaBasePath(parser.$refs._root$Ref.path, parser.schema) : parser.$refs._root$Ref.path;
		const promises = crawl$2(parser.schema, parser.$refs._root$Ref.path + "#", rootScopeBase, parser.$refs._root$Ref.dynamicIdScope, parser.$refs, options);
		return Promise.all(promises);
	} catch (e) {
		return Promise.reject(e);
	}
}
/**
* Recursively crawls the given value, and resolves any external JSON references.
*
* @param obj - The value to crawl. If it's not an object or array, it will be ignored.
* @param path - The full path of `obj`, possibly with a JSON Pointer in the hash
* @param {boolean} external - Whether `obj` was found in an external document.
* @param $refs
* @param options
* @param seen - Internal.
*
* @returns
* Returns an array of promises. There will be one promise for each JSON reference in `obj`.
* If `obj` does not contain any JSON references, then the array will be empty.
* If any of the JSON references point to files that contain additional JSON references,
* then the corresponding promise will internally reference an array of promises.
*/
function crawl$2(obj, path, scopeBase, dynamicIdScope, $refs, options, seen, external) {
	seen ||= /* @__PURE__ */ new Set();
	let promises = [];
	if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !seen.has(obj)) {
		seen.add(obj);
		const currentScopeBase = scopeBase;
		if ($Ref.isExternal$Ref(obj)) promises.push(resolve$Ref(obj, path, currentScopeBase, dynamicIdScope, $refs, options));
		const keys = Object.keys(obj);
		for (const key of keys) {
			const keyPath = Pointer.join(path, key);
			const value = obj[key];
			const childScopeBase = dynamicIdScope && value && typeof value === "object" && !ArrayBuffer.isView(value) ? getSchemaBasePath(currentScopeBase, value) : currentScopeBase;
			promises = promises.concat(crawl$2(value, keyPath, childScopeBase, dynamicIdScope, $refs, options, seen, external));
		}
	}
	return promises;
}
/**
* Resolves the given JSON Reference, and then crawls the resulting value.
*
* @param $ref - The JSON Reference to resolve
* @param path - The full path of `$ref`, possibly with a JSON Pointer in the hash
* @param $refs
* @param options
*
* @returns
* The promise resolves once all JSON references in the object have been resolved,
* including nested references that are contained in externally-referenced files.
*/
async function resolve$Ref($ref, path, scopeBase, dynamicIdScope, $refs, options) {
	const resolutionBase = options.dereference?.externalReferenceResolution === "root" ? cwd() : dynamicIdScope ? scopeBase : path;
	const resolvedPath = resolve$2(resolutionBase, $ref.$ref);
	const withoutHash = stripHash(resolvedPath);
	const ref = $refs._get$Ref(withoutHash);
	if (ref) return Promise.resolve(ref.value);
	try {
		const reference = $ref.$ref;
		const parseTarget = {
			url: resolvedPath,
			baseUrl: resolutionBase
		};
		if (typeof reference === "string") parseTarget.reference = reference;
		const result = await parse$1(parseTarget, $refs, options);
		const parsedRef = $refs._get$Ref(withoutHash);
		const promises = crawl$2(result, withoutHash + "#", withoutHash, parsedRef?.dynamicIdScope ?? false, $refs, options, /* @__PURE__ */ new Set(), true);
		return Promise.all(promises);
	} catch (err) {
		if (!options?.continueOnError || !isHandledError(err)) throw err;
		if ($refs._$refs[withoutHash]) {
			err.source = decodeURI(stripHash(path));
			err.path = safePointerToPath(getHash(path));
		}
		return [];
	}
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/bundle.js
/**
* Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
* only has *internal* references, not any *external* references.
* This method mutates the JSON schema object, adding new references and re-mapping existing ones.
*
* @param parser
* @param options
*/
function bundle$1(parser, options) {
	const rootScopeBase = parser.$refs._root$Ref.dynamicIdScope ? getSchemaBasePath(parser.$refs._root$Ref.path, parser.schema) : parser.$refs._root$Ref.path;
	const inventory = [];
	crawl$1(parser, "schema", parser.$refs._root$Ref.path + "#", rootScopeBase, parser.$refs._root$Ref.dynamicIdScope, "#", 0, inventory, parser.$refs, options);
	remap(inventory, options, parser.schema && typeof parser.schema === "object" && "$id" in parser.schema ? parser.schema.$id : void 0);
	if ((options.bundle || {}).optimizeInternalRefs !== false) fixRefsThroughRefs(inventory, parser.schema);
}
/**
* Recursively crawls the given value, and inventories all JSON references.
*
* @param parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
* @param key - The property key of `parent` to be crawled
* @param path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
* @param pathFromRoot - The path of the property being crawled, from the schema root
* @param indirections
* @param inventory - An array of already-inventoried $ref pointers
* @param $refs
* @param options
*/
function crawl$1(parent, key, path, scopeBase, dynamicIdScope, pathFromRoot, indirections, inventory, $refs, options) {
	const obj = key === null ? parent : parent[key];
	const bundleOptions = options.bundle || {};
	const isExcludedPath = bundleOptions.excludedPathMatcher || (() => false);
	if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !isExcludedPath(pathFromRoot)) {
		const currentScopeBase = scopeBase;
		if ($Ref.isAllowed$Ref(obj)) inventory$Ref(parent, key, path, currentScopeBase, dynamicIdScope, pathFromRoot, indirections, inventory, $refs, options);
		else {
			const keys = Object.keys(obj).sort((a, b) => {
				if (a === "definitions" || a === "$defs") return -1;
				else if (b === "definitions" || b === "$defs") return 1;
				else return a.length - b.length;
			});
			for (const key of keys) {
				const keyPath = Pointer.join(path, key);
				const keyPathFromRoot = Pointer.join(pathFromRoot, key);
				const value = obj[key];
				const childScopeBase = dynamicIdScope && value && typeof value === "object" && !ArrayBuffer.isView(value) ? getSchemaBasePath(currentScopeBase, value) : currentScopeBase;
				if ($Ref.isAllowed$Ref(value)) inventory$Ref(obj, key, keyPath, childScopeBase, dynamicIdScope, keyPathFromRoot, indirections, inventory, $refs, options);
				else crawl$1(obj, key, keyPath, childScopeBase, dynamicIdScope, keyPathFromRoot, indirections, inventory, $refs, options);
				if (value && typeof value === "object" && !Array.isArray(value)) {
					if ("$ref" in value) bundleOptions?.onBundle?.(value["$ref"], obj[key], obj, key);
				}
			}
		}
	}
}
/**
* Inventories the given JSON Reference (i.e. records detailed information about it so we can
* optimize all $refs in the schema), and then crawls the resolved value.
*
* @param $refParent - The object that contains a JSON Reference as one of its keys
* @param $refKey - The key in `$refParent` that is a JSON Reference
* @param path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
* @param indirections - unknown
* @param pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
* @param inventory - An array of already-inventoried $ref pointers
* @param $refs
* @param options
*/
function inventory$Ref($refParent, $refKey, path, scopeBase, dynamicIdScope, pathFromRoot, indirections, inventory, $refs, options) {
	const $ref = $refKey === null ? $refParent : $refParent[$refKey];
	const $refPath = resolve$2(dynamicIdScope ? scopeBase : path, $ref.$ref);
	const pointer = $refs._resolve($refPath, pathFromRoot, options);
	if (pointer === null) return;
	const depth = Pointer.parse(pathFromRoot).length;
	const file = stripHash(pointer.path);
	const hash = getHash(pointer.path);
	const external = file !== $refs._root$Ref.path && !$refs._aliases[file];
	const extended = $Ref.isExtended$Ref($ref);
	indirections += pointer.indirections;
	const existingEntry = findInInventory(inventory, $refParent, $refKey);
	if (existingEntry) if (depth < existingEntry.depth || indirections < existingEntry.indirections) removeFromInventory(inventory, existingEntry);
	else return;
	inventory.push({
		$ref,
		parent: $refParent,
		key: $refKey,
		pathFromRoot,
		depth,
		file,
		hash,
		value: pointer.value,
		circular: pointer.circular,
		extended,
		external,
		indirections
	});
	if (!existingEntry || external) crawl$1(pointer.value, null, pointer.path, pointer.$ref.path, pointer.$ref.dynamicIdScope, pathFromRoot, indirections + 1, inventory, $refs, options);
}
/**
* Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
* Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
* value are re-mapped to point to the first reference.
*
* @example: {
*    first: { $ref: somefile.json#/some/part },
*    second: { $ref: somefile.json#/another/part },
*    third: { $ref: somefile.json },
*    fourth: { $ref: somefile.json#/some/part/sub/part }
*  }
*
* In this example, there are four references to the same file, but since the third reference points
* to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
* remapped to point inside the third one.
*
* On the other hand, if the third reference DIDN'T exist, then the first and second would both need
* to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
* need to be dereferenced, because it can be remapped to point inside the first one.
*
* @param inventory
*/
function remap(inventory, options, rootId) {
	inventory.sort((a, b) => {
		if (a.file !== b.file) return a.file < b.file ? -1 : 1;
		else if (a.hash !== b.hash) return a.hash < b.hash ? -1 : 1;
		else if (a.circular !== b.circular) return a.circular ? -1 : 1;
		else if (a.extended !== b.extended) return a.extended ? 1 : -1;
		else if (a.indirections !== b.indirections) return a.indirections - b.indirections;
		else if (a.depth !== b.depth) return a.depth - b.depth;
		else {
			const aDefinitionsIndex = Math.max(a.pathFromRoot.lastIndexOf("/definitions"), a.pathFromRoot.lastIndexOf("/$defs"));
			const bDefinitionsIndex = Math.max(b.pathFromRoot.lastIndexOf("/definitions"), b.pathFromRoot.lastIndexOf("/$defs"));
			if (aDefinitionsIndex !== bDefinitionsIndex) return bDefinitionsIndex - aDefinitionsIndex;
			else return a.pathFromRoot.length - b.pathFromRoot.length;
		}
	});
	let file, hash, pathFromRoot;
	for (const entry of inventory) {
		const bundleOpts = options.bundle || {};
		if (!entry.external) {
			if (bundleOpts.optimizeInternalRefs !== false) entry.$ref.$ref = entry.hash;
		} else if (entry.file === file && entry.hash === hash) if (rootId && isInsideIdScope(inventory, entry)) entry.$ref.$ref = rootId + pathFromRoot;
		else entry.$ref.$ref = pathFromRoot;
		else if (entry.file === file && entry.hash.indexOf(hash + "/") === 0) {
			const subPath = Pointer.join(pathFromRoot, Pointer.parse(entry.hash.replace(hash, "#")));
			if (rootId && isInsideIdScope(inventory, entry)) entry.$ref.$ref = rootId + subPath;
			else entry.$ref.$ref = subPath;
		} else {
			file = entry.file;
			hash = entry.hash;
			pathFromRoot = entry.pathFromRoot;
			entry.$ref = entry.parent[entry.key] = $Ref.dereference(entry.$ref, entry.value, options);
			if (entry.circular) entry.$ref.$ref = entry.pathFromRoot;
		}
	}
}
/**
* TODO
*/
function findInInventory(inventory, $refParent, $refKey) {
	for (const existingEntry of inventory) if (existingEntry && existingEntry.parent === $refParent && existingEntry.key === $refKey) return existingEntry;
}
function removeFromInventory(inventory, entry) {
	const index = inventory.indexOf(entry);
	inventory.splice(index, 1);
}
/**
* After remapping, some $ref paths may traverse through other $ref nodes.
* JSON pointer resolution does not follow $ref indirection, so these paths are invalid.
* This function detects and fixes such paths by following any intermediate $refs
* to compute a valid direct path.
*/
function fixRefsThroughRefs(inventory, schema) {
	for (const entry of inventory) {
		if (!entry.$ref || typeof entry.$ref !== "object" || !("$ref" in entry.$ref)) continue;
		const refValue = entry.$ref.$ref;
		if (typeof refValue !== "string" || !refValue.startsWith("#/")) continue;
		const fixedPath = resolvePathThroughRefs(schema, refValue);
		if (fixedPath !== refValue) entry.$ref.$ref = fixedPath;
	}
}
/**
* Walks a JSON pointer path through the schema. If any intermediate value
* is a $ref, follows it and adjusts the path accordingly.
* Returns the corrected path that doesn't traverse through any $ref.
*/
function resolvePathThroughRefs(schema, refPath) {
	if (!refPath.startsWith("#/")) return refPath;
	const segments = refPath.slice(2).split("/");
	let current = schema;
	const resolvedSegments = [];
	for (const seg of segments) {
		if (current === null || current === void 0 || typeof current !== "object") return refPath;
		if ("$ref" in current && typeof current.$ref === "string" && current.$ref.startsWith("#/")) {
			const targetSegments = current.$ref.slice(2).split("/");
			resolvedSegments.length = 0;
			resolvedSegments.push(...targetSegments);
			current = walkPath(schema, current.$ref);
			if (current === null || current === void 0 || typeof current !== "object") return refPath;
		}
		const decoded = seg.replace(/~1/g, "/").replace(/~0/g, "~");
		current = current[Array.isArray(current) ? parseInt(decoded) : decoded];
		resolvedSegments.push(seg);
	}
	return "#/" + resolvedSegments.join("/");
}
/**
* Walks a JSON pointer path through a schema object, returning the value at that path.
*/
function walkPath(schema, path) {
	if (!path.startsWith("#/")) return;
	const segments = path.slice(2).split("/");
	let current = schema;
	for (const seg of segments) {
		if (current === null || current === void 0 || typeof current !== "object") return;
		const decoded = seg.replace(/~1/g, "/").replace(/~0/g, "~");
		current = current[Array.isArray(current) ? parseInt(decoded) : decoded];
	}
	return current;
}
/**
* Checks whether the given inventory entry is located inside a sub-schema that has its own $id.
* If so, root-relative JSON Pointer $refs placed at this location would be resolved against
* the $id base URI rather than the document root, making them invalid.
*/
function isInsideIdScope(inventory, entry) {
	for (const other of inventory) {
		if (other.pathFromRoot === "#" || other.pathFromRoot === "#/") continue;
		if (entry.pathFromRoot.startsWith(other.pathFromRoot + "/")) {
			if (other.value && typeof other.value === "object" && "$id" in other.value) return true;
		}
	}
	return false;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/dereference.js
var dereference_default = dereference$1;
/**
* Crawls the JSON schema, finds all JSON references, and dereferences them.
* This method mutates the JSON schema object, replacing JSON references with their resolved value.
*
* @param parser
* @param options
*/
function dereference$1(parser, options) {
	const start = Date.now();
	const rootScopeBase = parser.$refs._root$Ref.dynamicIdScope ? getSchemaBasePath(parser.$refs._root$Ref.path, parser.schema) : parser.$refs._root$Ref.path;
	const dereferenced = crawl(parser.schema, parser.$refs._root$Ref.path, rootScopeBase, parser.$refs._root$Ref.dynamicIdScope, "#", /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), /* @__PURE__ */ new Map(), parser.$refs, options, start, 0);
	parser.$refs.circular = dereferenced.circular;
	parser.schema = dereferenced.value;
}
/**
* Recursively crawls the given value, and dereferences any JSON references.
*
* @param obj - The value to crawl. If it's not an object or array, it will be ignored.
* @param path - The full path of `obj`, possibly with a JSON Pointer in the hash
* @param pathFromRoot - The path of `obj` from the schema root
* @param parents - An array of the parent objects that have already been dereferenced
* @param processedObjects - An array of all the objects that have already been processed
* @param dereferencedCache - An map of all the dereferenced objects
* @param $refs
* @param options
* @param startTime - The time when the dereferencing started
* @param depth - The current recursion depth
* @returns
*/
function crawl(obj, path, scopeBase, dynamicIdScope, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth) {
	let dereferenced;
	const result = {
		value: obj,
		circular: false
	};
	checkDereferenceTimeout(startTime, options);
	const derefOptions = options.dereference || {};
	const maxDepth = derefOptions.maxDepth ?? 500;
	if (depth > maxDepth) throw new RangeError(`Maximum dereference depth (${maxDepth}) exceeded at ${pathFromRoot}. This likely indicates an extremely deep or recursive schema. You can increase this limit with the dereference.maxDepth option.`);
	const isExcludedPath = derefOptions.excludedPathMatcher || (() => false);
	if (derefOptions?.circular === "ignore" || !processedObjects.has(obj)) {
		if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !isExcludedPath(pathFromRoot)) {
			parents.add(obj);
			processedObjects.add(obj);
			const currentScopeBase = scopeBase;
			if ($Ref.isAllowed$Ref(obj, options)) {
				dereferenced = dereference$Ref(obj, path, currentScopeBase, dynamicIdScope, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth);
				result.circular = dereferenced.circular;
				result.value = dereferenced.value;
			} else for (const key of Object.keys(obj)) {
				checkDereferenceTimeout(startTime, options);
				const keyPath = Pointer.join(path, key);
				const keyPathFromRoot = Pointer.join(pathFromRoot, key);
				if (isExcludedPath(keyPathFromRoot)) continue;
				const value = obj[key];
				const childScopeBase = dynamicIdScope && value && typeof value === "object" && !ArrayBuffer.isView(value) ? getSchemaBasePath(currentScopeBase, value) : currentScopeBase;
				let circular;
				if ($Ref.isAllowed$Ref(value, options)) {
					dereferenced = dereference$Ref(value, keyPath, childScopeBase, dynamicIdScope, keyPathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth);
					circular = dereferenced.circular;
					if (obj[key] !== dereferenced.value) {
						const preserved = /* @__PURE__ */ new Map();
						if (derefOptions?.preservedProperties) {
							if (typeof obj[key] === "object" && !Array.isArray(obj[key])) derefOptions?.preservedProperties.forEach((prop) => {
								if (prop in obj[key]) preserved.set(prop, obj[key][prop]);
							});
						}
						let assignedValue = dereferenced.value;
						if (derefOptions?.cloneReferences && !circular && assignedValue && typeof assignedValue === "object") assignedValue = structuredClone(assignedValue);
						obj[key] = assignedValue;
						if (derefOptions?.preservedProperties) {
							if (preserved.size && typeof obj[key] === "object" && !Array.isArray(obj[key])) preserved.forEach((value, prop) => {
								obj[key][prop] = value;
							});
						}
						derefOptions?.onDereference?.(value.$ref, obj[key], obj, key);
					}
				} else if (!parents.has(value)) {
					dereferenced = crawl(value, keyPath, childScopeBase, dynamicIdScope, keyPathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth + 1);
					circular = dereferenced.circular;
					if (obj[key] !== dereferenced.value) obj[key] = dereferenced.value;
				} else circular = foundCircularReference(keyPath, $refs, options);
				result.circular = result.circular || circular;
			}
			parents.delete(obj);
		}
	}
	return result;
}
/**
* Dereferences the given JSON Reference, and then crawls the resulting value.
*
* @param $ref - The JSON Reference to resolve
* @param path - The full path of `$ref`, possibly with a JSON Pointer in the hash
* @param pathFromRoot - The path of `$ref` from the schema root
* @param parents - An array of the parent objects that have already been dereferenced
* @param processedObjects - An array of all the objects that have already been dereferenced
* @param dereferencedCache - An map of all the dereferenced objects
* @param $refs
* @param options
* @returns
*/
function dereference$Ref($ref, path, scopeBase, dynamicIdScope, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth) {
	const $refPath = resolve$2($Ref.isExternal$Ref($ref) && options?.dereference?.externalReferenceResolution === "root" ? cwd() : dynamicIdScope ? scopeBase : path, $ref.$ref);
	const cache = dereferencedCache.get($refPath);
	if (cache) {
		if (!cache.circular) {
			const refKeys = Object.keys($ref);
			if (refKeys.length > 1) {
				const extraKeys = {};
				for (const key of refKeys) if (key !== "$ref" && !(key in cache.value)) extraKeys[key] = $ref[key];
				return {
					circular: cache.circular,
					value: Object.assign({}, cache.value, extraKeys)
				};
			}
			return cache;
		}
		if (typeof cache.value === "object" && "$ref" in cache.value && "$ref" in $ref) {
			if (cache.value.$ref === $ref.$ref) {
				foundCircularReference(path, $refs, options);
				return cache;
			}
		} else {
			foundCircularReference(path, $refs, options);
			return cache;
		}
	}
	const pointer = $refs._resolve($refPath, path, options);
	if (pointer === null) return {
		circular: false,
		value: null
	};
	const directCircular = pointer.circular;
	let circular = directCircular || parents.has(pointer.value);
	if (circular) foundCircularReference(path, $refs, options);
	let dereferencedValue = $Ref.dereference($ref, pointer.value, options);
	if (!circular) {
		const dereferenced = crawl(dereferencedValue, pointer.path, pointer.$ref.path, pointer.$ref.dynamicIdScope, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime, depth + 1);
		circular = dereferenced.circular;
		dereferencedValue = dereferenced.value;
	}
	if (circular && !directCircular && options.dereference?.circular === "ignore") dereferencedValue = $ref;
	if (directCircular) dereferencedValue.$ref = pathFromRoot;
	const dereferencedObject = {
		circular,
		value: dereferencedValue
	};
	if (Object.keys($ref).length === 1) dereferencedCache.set($refPath, dereferencedObject);
	return dereferencedObject;
}
/**
* Check if we've run past our allowed timeout and throw an error if we have.
*
* @param startTime - The time when the dereferencing started.
* @param options
*/
function checkDereferenceTimeout(startTime, options) {
	if (options && options.timeoutMs) {
		if (Date.now() - startTime > options.timeoutMs) throw new TimeoutError(options.timeoutMs);
	}
}
/**
* Called when a circular reference is found.
* It sets the {@link $Refs#circular} flag, executes the options.dereference.onCircular callback,
* and throws an error if options.dereference.circular is false.
*
* @param keyPath - The JSON Reference path of the circular reference
* @param $refs
* @param options
* @returns - always returns true, to indicate that a circular reference was found
*/
function foundCircularReference(keyPath, $refs, options) {
	$refs.circular = true;
	options?.dereference?.onCircular?.(keyPath);
	if (!options.dereference.circular) throw /* @__PURE__ */ new ReferenceError(`Circular $ref pointer found at ${keyPath}`);
	return true;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/next.js
function makeNext() {
	if (typeof process === "object" && typeof process.nextTick === "function") return process.nextTick;
	else if (typeof setImmediate === "function") return setImmediate;
	else return function next(f) {
		setTimeout(f, 0);
	};
}
var next_default = makeNext();
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/maybe.js
function maybe(cb, promise) {
	if (cb) {
		promise.then(function(result) {
			next_default(function() {
				cb(null, result);
			});
		}, function(err) {
			next_default(function() {
				cb(err);
			});
		});
		return;
	} else return promise;
}
//#endregion
//#region ../../node_modules/.bun/@apidevtools+json-schema-ref-parser@15.3.5+851ea6eaa318e35d/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/index.js
/**
* This class parses a JSON schema, builds a map of its JSON references and their resolved values,
* and provides methods for traversing, manipulating, and dereferencing those references.
*
* @class
*/
var $RefParser = class $RefParser {
	/**
	* The parsed (and possibly dereferenced) JSON schema object
	*
	* @type {object}
	* @readonly
	*/
	schema = null;
	/**
	* The resolved JSON references
	*
	* @type {$Refs}
	* @readonly
	*/
	$refs = new $Refs();
	async parse() {
		const args = normalizeArgs(arguments);
		let promise;
		if (!args.path && !args.schema) {
			const err = /* @__PURE__ */ new Error(`Expected a file path, URL, or object. Got ${args.path || args.schema}`);
			return maybe(args.callback, Promise.reject(err));
		}
		this.schema = null;
		this.$refs = new $Refs();
		let pathType = "http";
		if (isFileSystemPath(args.path)) {
			args.path = fromFileSystemPath(args.path);
			pathType = "file";
		} else if (!args.path && args.schema && "$id" in args.schema && args.schema.$id) {
			const params = parse$2(args.schema.$id);
			const port = params.port ?? (params.protocol === "https:" ? 443 : 80);
			args.path = `${params.protocol}//${params.hostname}:${port}`;
		}
		args.path = resolve$2(cwd(), args.path);
		if (args.schema && typeof args.schema === "object") {
			const $ref = this.$refs._add(args.path);
			$ref.value = args.schema;
			$ref.pathType = pathType;
			$ref.dynamicIdScope = usesDynamicIdScope($ref.value);
			registerSchemaResources(this.$refs, $ref.path, $ref.value, $ref.pathType, $ref.dynamicIdScope);
			promise = Promise.resolve(args.schema);
		} else promise = parse$1(args.path, this.$refs, args.options);
		try {
			const result = await promise;
			if (result !== null && typeof result === "object" && !Buffer.isBuffer(result)) {
				this.schema = result;
				return maybe(args.callback, Promise.resolve(this.schema));
			} else if (args.options.continueOnError) {
				this.schema = null;
				return maybe(args.callback, Promise.resolve(this.schema));
			} else throw new SyntaxError(`"${this.$refs._root$Ref.path || result}" is not a valid JSON Schema`);
		} catch (err) {
			if (!args.options.continueOnError || !isHandledError(err)) return maybe(args.callback, Promise.reject(err));
			if (this.$refs._$refs[stripHash(args.path)]) this.$refs._$refs[stripHash(args.path)].addError(err);
			return maybe(args.callback, Promise.resolve(null));
		}
	}
	static parse() {
		const parser = new $RefParser();
		return parser.parse.apply(parser, arguments);
	}
	async resolve() {
		const args = normalizeArgs(arguments);
		try {
			await this.parse(args.path, args.schema, args.options);
			await resolveExternal(this, args.options);
			finalize(this);
			return maybe(args.callback, Promise.resolve(this.$refs));
		} catch (err) {
			return maybe(args.callback, Promise.reject(err));
		}
	}
	static resolve() {
		const instance = new $RefParser();
		return instance.resolve.apply(instance, arguments);
	}
	static bundle() {
		const instance = new $RefParser();
		return instance.bundle.apply(instance, arguments);
	}
	async bundle() {
		const args = normalizeArgs(arguments);
		try {
			await this.resolve(args.path, args.schema, args.options);
			bundle$1(this, args.options);
			finalize(this);
			return maybe(args.callback, Promise.resolve(this.schema));
		} catch (err) {
			return maybe(args.callback, Promise.reject(err));
		}
	}
	static dereference() {
		const instance = new $RefParser();
		return instance.dereference.apply(instance, arguments);
	}
	async dereference() {
		const args = normalizeArgs(arguments);
		try {
			await this.resolve(args.path, args.schema, args.options);
			dereference_default(this, args.options);
			finalize(this);
			return maybe(args.callback, Promise.resolve(this.schema));
		} catch (err) {
			return maybe(args.callback, Promise.reject(err));
		}
	}
};
function finalize(parser) {
	if (JSONParserErrorGroup.getParserErrors(parser).length > 0) throw new JSONParserErrorGroup(parser);
}
$RefParser.parse;
$RefParser.resolve;
$RefParser.bundle;
$RefParser.dereference;
//#endregion
//#region src/core/resolve-ref.ts
async function resolveRefs(source, document) {
	try {
		return await $RefParser.dereference(source.baseUri, document, {
			dereference: {
				circular: false,
				preservedProperties: ["description", "summary"],
				externalReferenceResolution: "relative"
			},
			resolve: { http: { safeUrlResolver: false } },
			mutateInputSchema: false
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const code = /circular/i.test(message) ? "CIRCULAR_REF" : "REF_RESOLUTION_FAILED";
		throw new OpenapiToolError(code, code === "CIRCULAR_REF" ? "Circular $ref detected while resolving OpenAPI document" : "Failed to resolve OpenAPI $ref values", {
			source: source.value,
			cause: message
		});
	}
}
//#endregion
//#region src/core/source.ts
function toSourceOutput(source) {
	return {
		type: source.type,
		value: source.value
	};
}
async function resolveSource(options) {
	const file = normalizeSingleOption(options.file ?? options.f, "file");
	const remote = normalizeSingleOption(options.remote ?? options.r, "remote");
	if (file && remote) throw new OpenapiToolError("SOURCE_CONFLICT", "--file and --remote cannot be used together", {
		file,
		remote
	});
	if (!file && !remote) throw new OpenapiToolError("SOURCE_REQUIRED", "Either --file or --remote is required");
	if (file) {
		const absolutePath = resolve(file);
		try {
			await access(absolutePath);
		} catch {
			throw new OpenapiToolError("FILE_NOT_FOUND", `OpenAPI file not found: ${file}`, { file });
		}
		return {
			type: "file",
			value: file,
			baseUri: pathToFileURL(absolutePath).href
		};
	}
	const remoteUrl = remote;
	validateRemoteUrl(remoteUrl);
	return {
		type: "remote",
		value: remoteUrl,
		baseUri: remoteUrl
	};
}
function normalizeSingleOption(value, name) {
	if (value === void 0 || value === null || value === false) return null;
	if (Array.isArray(value)) {
		if (value.length !== 1) throw new OpenapiToolError("INVALID_ARGUMENT", `--${name} can only be specified once`, { [name]: value });
		return normalizeSingleOption(value[0], name);
	}
	if (typeof value !== "string" || value.length === 0) throw new OpenapiToolError("INVALID_ARGUMENT", `--${name} must be a non-empty string`);
	return value;
}
function validateRemoteUrl(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new OpenapiToolError("INVALID_ARGUMENT", `Invalid remote URL: ${value}`, { remote: value });
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") throw new OpenapiToolError("INVALID_ARGUMENT", "Remote URL must use http or https", { remote: value });
}
//#endregion
//#region src/commands/get.ts
async function getApi(source, index) {
	validateIndex(index);
	const dereferenced = await resolveRefs(source, (await loadDocument(source)).document);
	const operations = collectOperations(filterDeprecated(cloneJsonObject(dereferenced)) ?? dereferenced);
	const operation = operations[index];
	if (!operation) throw new OpenapiToolError("INDEX_NOT_FOUND", `API index not found: ${index}`, {
		index,
		total: operations.length
	});
	const operationFields = cloneJsonObject(operation.operation);
	const parameters = mergeParameters(operation.pathParameters, operation.operation.parameters);
	const api = {
		...operationFields,
		index: operation.index,
		name: operation.name,
		path: operation.path,
		method: operation.method,
		pathWithMethod: operation.pathWithMethod,
		tags: operation.tags,
		operationId: operation.operationId,
		summary: operation.summary,
		description: operation.description,
		parameters,
		requestBody: isJsonObject(operationFields.requestBody) ? operationFields.requestBody : null,
		responses: isJsonObject(operationFields.responses) ? operationFields.responses : {},
		extensions: pickExtensions(operationFields)
	};
	return {
		command: "get",
		source: toSourceOutput(source),
		api
	};
}
function parseIndex(value) {
	if (typeof value !== "string" || value.length === 0) throw new OpenapiToolError("INVALID_INDEX", "<index> is required");
	if (!/^\d+$/.test(value)) throw new OpenapiToolError("INVALID_INDEX", "<index> must be a non-negative integer", { index: value });
	return Number(value);
}
function validateIndex(index) {
	if (!Number.isInteger(index) || index < 0) throw new OpenapiToolError("INVALID_INDEX", "<index> must be a non-negative integer", { index });
}
function pickExtensions(operation) {
	const extensions = {};
	for (const [key, value] of Object.entries(operation)) if (key.startsWith("x-")) extensions[key] = value;
	return extensions;
}
//#endregion
//#region src/commands/list.ts
async function listApis(source, options) {
	validatePagination(options);
	const loaded = await loadDocument(source);
	const operations = collectOperations(filterDeprecated(cloneJsonObject(loaded.document)) ?? loaded.document);
	const filteredOperations = options.keywords.length === 0 ? operations : operations.filter((operation) => matchesAnyKeyword(operation, options.keywords));
	const start = options.page * options.size;
	const items = filteredOperations.slice(start, start + options.size).map(toListItem);
	const total = filteredOperations.length;
	return {
		command: "list",
		source: toSourceOutput(source),
		pagination: {
			page: options.page,
			size: options.size,
			total,
			totalPages: total === 0 ? 0 : Math.ceil(total / options.size)
		},
		filters: {
			keywords: options.keywords,
			mode: "OR",
			caseSensitive: true,
			regex: false
		},
		items
	};
}
function validatePagination(options) {
	if (!Number.isInteger(options.page) || options.page < 0) throw new OpenapiToolError("INVALID_ARGUMENT", "--page must be a non-negative integer", { page: options.page });
	if (!Number.isInteger(options.size) || options.size <= 0) throw new OpenapiToolError("INVALID_ARGUMENT", "--size must be a positive integer", { size: options.size });
}
function matchesAnyKeyword(operation, keywords) {
	const searchableValues = [
		operation.path,
		operation.name,
		operation.description,
		...operation.tags,
		operation.operationId
	].filter((value) => typeof value === "string");
	return keywords.some((keyword) => searchableValues.some((value) => value.includes(keyword)));
}
function parseListOptions(rawOptions) {
	return {
		keywords: normalizeKeywords(rawOptions.keyword ?? rawOptions.k),
		page: normalizeInteger(rawOptions.page, 0, "page"),
		size: normalizeInteger(rawOptions.size, 10, "size")
	};
}
function normalizeKeywords(value) {
	if (value === void 0 || value === null || value === false) return [];
	const values = Array.isArray(value) ? value : [value];
	return values.map((item) => {
		if (typeof item !== "string") throw new OpenapiToolError("INVALID_ARGUMENT", "--keyword must be a string", { keyword: values });
		return item;
	});
}
function normalizeInteger(value, defaultValue, name) {
	if (value === void 0 || value === null || value === false) return defaultValue;
	if (Array.isArray(value)) throw new OpenapiToolError("INVALID_ARGUMENT", `--${name} can only be specified once`, { [name]: value });
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed)) throw new OpenapiToolError("INVALID_ARGUMENT", `--${name} must be an integer`, { [name]: String(value) });
	return parsed;
}
//#endregion
//#region src/output/success.ts
function formatJson(payload) {
	return `${JSON.stringify(payload, null, 2)}\n`;
}
//#endregion
//#region src/cli.ts
var defaultIO = {
	stdout: (text) => process.stdout.write(text),
	stderr: (text) => process.stderr.write(text)
};
async function runCli(args = process.argv.slice(2), io = defaultIO) {
	try {
		const cli = createCli();
		cli.parse([
			"bun",
			"openapi-tool",
			...args
		], { run: false });
		const source = await resolveSource(cli.options);
		let payload;
		if (cli.matchedCommandName === "list") payload = await listApis(source, parseListOptions(cli.options));
		else if (cli.matchedCommandName === "get") payload = await getApi(source, parseIndex(cli.args[0]));
		else throw new OpenapiToolError("INVALID_ARGUMENT", "Command must be one of: list, get");
		io.stdout(formatJson(payload));
		return 0;
	} catch (error) {
		io.stderr(formatJson(toErrorPayload(error)));
		return getExitCode(error);
	}
}
function createCli() {
	const cli = cac("openapi-tool");
	const addSourceOptions = (command) => command.option("-f, --file <path>", "Use local OpenAPI document").option("-r, --remote <url>", "Use remote OpenAPI document URL");
	addSourceOptions(cli.command("list", "List non-deprecated APIs").option("-k, --keyword <keyword>", "Filter APIs by keyword").option("--page <number>", "Page number, starts from 0").option("--size <number>", "Page size"));
	addSourceOptions(cli.command("get <index>", "Get API details by stable index"));
	cli.help();
	return cli;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const exitCode = await runCli();
	process.exitCode = exitCode;
}
//#endregion
export { runCli };
