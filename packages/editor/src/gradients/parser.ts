/*
 * CSS gradient string parser (adapted from OpenCut `src/gradients/parser.ts`,
 * originally based on https://github.com/rafaelcaricio/gradient-parser).
 * Supports linear/radial (+repeating) gradients with angles, side-or-corner
 * directions, positioned radials, and hex/rgb(a)/hsl(a)/var color stops.
 */

type GradientType =
  | 'linear-gradient'
  | 'repeating-linear-gradient'
  | 'radial-gradient'
  | 'repeating-radial-gradient';

type DirectionalOrientation = { type: 'directional'; value: string };
type AngularOrientation = { type: 'angular'; value: string };
type LinearOrientation = DirectionalOrientation | AngularOrientation;

export type GradientDistance =
  | { type: '%'; value: string }
  | { type: 'position-keyword'; value: string }
  | { type: 'calc'; value: string }
  | { type: 'px'; value: string }
  | { type: 'em'; value: string };

type PositionValue = { x?: GradientDistance; y?: GradientDistance };
export type GradientPosition = { type: 'position'; value: PositionValue };

type ExtentKeyword = { type: 'extent-keyword'; value: string };

type ShapeValue = 'circle' | 'ellipse';
export type GradientShape = {
  type: 'shape';
  value: ShapeValue;
  style?: GradientDistance | ExtentKeyword | GradientPosition;
  at?: GradientPosition;
};

type DefaultRadial = { type: 'default-radial'; at: GradientPosition };

export type RadialOrientation =
  | GradientShape
  | (ExtentKeyword & { at?: GradientPosition })
  | DefaultRadial;

export type GradientOrientation = LinearOrientation | Array<RadialOrientation>;

export type GradientColor =
  | { type: 'hex'; value: string }
  | { type: 'literal'; value: string }
  | { type: 'rgb'; value: Array<string> }
  | { type: 'rgba'; value: Array<string> }
  | { type: 'hsl'; value: [string, string, string] }
  | { type: 'hsla'; value: [string, string, string, string] }
  | { type: 'var'; value: string };

export type GradientColorStop = GradientColor & { length?: GradientDistance };

export type GradientAst = {
  type: GradientType;
  orientation: GradientOrientation | undefined;
  colorStops: Array<GradientColorStop>;
};

const tokens = {
  linearGradient: /^(-(webkit|o|ms|moz)-)?(linear-gradient)/i,
  repeatingLinearGradient: /^(-(webkit|o|ms|moz)-)?(repeating-linear-gradient)/i,
  radialGradient: /^(-(webkit|o|ms|moz)-)?(radial-gradient)/i,
  repeatingRadialGradient: /^(-(webkit|o|ms|moz)-)?(repeating-radial-gradient)/i,
  sideOrCorner:
    /^to (left (top|bottom)|right (top|bottom)|top (left|right)|bottom (left|right)|left|right|top|bottom)/i,
  extentKeywords:
    /^(closest-side|closest-corner|farthest-side|farthest-corner|contain|cover)/,
  positionKeywords: /^(left|center|right|top|bottom)/i,
  pixelValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,
  percentageValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))%/,
  emValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,
  angleValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,
  radianValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))rad/,
  startCall: /^\(/,
  endCall: /^\)/,
  comma: /^,/,
  hexColor: /^#([0-9a-fA-F]+)/,
  literalColor: /^([a-zA-Z]+)/,
  rgbColor: /^rgb/i,
  rgbaColor: /^rgba/i,
  varColor: /^var/i,
  calcValue: /^calc/i,
  variableName: /^(--[a-zA-Z0-9-,\s#]+)/,
  number: /^(([0-9]*\.[0-9]+)|([0-9]+\.?))/,
  hslColor: /^hsl/i,
  hslaColor: /^hsla/i,
};

let input = '';

const error = (message: string): never => {
  const err = new Error(`${input}: ${message}`);
  (err as Error & { source?: string }).source = input;
  throw err;
};

const getAst = (): Array<GradientAst> => {
  const ast = matchListing(matchDefinition);
  if (input.length > 0) {
    error('Invalid input not EOF');
  }
  return ast;
};

const matchDefinition = (): GradientAst | undefined =>
  matchGradient('linear-gradient', tokens.linearGradient, matchLinearOrientation) ||
  matchGradient(
    'repeating-linear-gradient',
    tokens.repeatingLinearGradient,
    matchLinearOrientation,
  ) ||
  matchGradient('radial-gradient', tokens.radialGradient, matchListRadialOrientations) ||
  matchGradient(
    'repeating-radial-gradient',
    tokens.repeatingRadialGradient,
    matchListRadialOrientations,
  );

const matchGradient = (
  gradientType: GradientType,
  pattern: RegExp,
  orientationMatcher: () => GradientOrientation | undefined,
): GradientAst | undefined =>
  matchCall(pattern, () => {
    const orientation = orientationMatcher();
    if (orientation && !scan(tokens.comma)) {
      error('Missing comma before color stops');
    }

    return {
      type: gradientType,
      orientation,
      colorStops: matchListing(matchColorStop),
    };
  });

const matchCall = <T>(
  pattern: RegExp,
  callback: (captures: RegExpExecArray) => T,
): T | undefined => {
  const captures = scan(pattern);
  if (!captures) return undefined;

  if (!scan(tokens.startCall)) error('Missing (');
  const result = callback(captures);
  if (!scan(tokens.endCall)) error('Missing )');

  return result;
};

const matchLinearOrientation = (): LinearOrientation | undefined => {
  const sideOrCorner = match('directional', tokens.sideOrCorner, 1);
  if (sideOrCorner) return sideOrCorner;

  const legacyDirection = match('position-keyword', tokens.positionKeywords, 1);
  if (legacyDirection) {
    return { type: 'directional', value: legacyDirection.value };
  }

  return (
    match('angular', tokens.angleValue, 1) || match('angular', tokens.radianValue, 1)
  );
};

const matchListRadialOrientations = (): Array<RadialOrientation> | undefined => {
  const radialOrientation = matchRadialOrientation();
  if (!radialOrientation) return undefined;

  const radialOrientations: Array<RadialOrientation> = [radialOrientation];
  const lookaheadCache = input;

  if (!scan(tokens.comma)) return radialOrientations;

  const nextRadial = matchRadialOrientation();
  if (!nextRadial) {
    input = lookaheadCache;
    return radialOrientations;
  }

  radialOrientations.push(nextRadial);
  return radialOrientations;
};

const matchRadialOrientation = (): RadialOrientation | undefined => {
  const radialType = matchCircle() || matchEllipse();
  if (radialType) {
    radialType.at = matchAtPosition();
    return radialType;
  }

  const extent = match('extent-keyword', tokens.extentKeywords, 1);
  if (extent) {
    const positionAt = matchAtPosition();
    if (positionAt) return { ...extent, at: positionAt };
    return extent;
  }

  const implicitEllipse = matchImplicitEllipse();
  if (implicitEllipse) return implicitEllipse;

  const atPosition = matchAtPosition();
  if (atPosition) return { type: 'default-radial', at: atPosition };

  const defaultPosition = matchPositioning();
  if (defaultPosition) return { type: 'default-radial', at: defaultPosition };

  return undefined;
};

const matchImplicitEllipse = (): GradientShape | undefined => {
  const lookaheadCache = input;

  const width = matchDistance();
  if (!width) return undefined;

  const height = matchDistance();
  if (!height) {
    input = lookaheadCache;
    return undefined;
  }

  const atPos = matchAtPosition();
  if (!atPos) {
    input = lookaheadCache;
    return undefined;
  }

  return {
    type: 'shape',
    value: 'ellipse',
    style: { type: 'position', value: { x: width, y: height } },
    at: atPos,
  };
};

const matchCircle = (): GradientShape | undefined => {
  const circle = match('shape', /^(circle)/i, 0) as GradientShape | undefined;
  if (!circle) return undefined;

  circle.style = matchLength() || match('extent-keyword', tokens.extentKeywords, 1);
  circle.value = 'circle';
  return circle;
};

const matchEllipse = (): GradientShape | undefined => {
  const ellipse = match('shape', /^(ellipse)/i, 0) as GradientShape | undefined;
  if (!ellipse) return undefined;

  ellipse.style =
    matchPositioning() ||
    matchDistance() ||
    match('extent-keyword', tokens.extentKeywords, 1);
  ellipse.value = 'ellipse';
  return ellipse;
};

const matchAtPosition = (): GradientPosition | undefined => {
  if (!match('position', /^at/, 0)) return undefined;

  const positioning = matchPositioning();
  if (!positioning) error('Missing positioning value');
  return positioning;
};

const matchPositioning = (): GradientPosition | undefined => {
  const location: PositionValue = { x: matchDistance(), y: matchDistance() };
  if (!location.x && !location.y) return undefined;
  return { type: 'position', value: location };
};

const matchListing = <T>(matcher: () => T | undefined): Array<T> => {
  const captures = matcher();
  const result: Array<T> = [];

  if (!captures) return result;

  result.push(captures);
  while (scan(tokens.comma)) {
    const nextCapture = matcher() ?? error('One extra comma');
    result.push(nextCapture);
  }

  return result;
};

const matchColorStop = (): GradientColorStop => {
  const color = matchColor() ?? error('Expected color definition');
  const length = matchDistance();
  return { ...color, length };
};

const matchColor = (): GradientColor | undefined =>
  match('hex', tokens.hexColor, 1) ||
  matchHSLAColor() ||
  matchHSLColor() ||
  matchRGBAColor() ||
  matchRGBColor() ||
  matchVarColor() ||
  match('literal', tokens.literalColor, 0);

const matchRGBColor = (): GradientColor | undefined =>
  matchCall(tokens.rgbColor, () => ({
    type: 'rgb' as const,
    value: matchListing(matchNumber),
  }));

const matchRGBAColor = (): GradientColor | undefined =>
  matchCall(tokens.rgbaColor, () => ({
    type: 'rgba' as const,
    value: matchListing(matchNumber),
  }));

const matchVarColor = (): GradientColor | undefined =>
  matchCall(tokens.varColor, () => ({
    type: 'var' as const,
    value: matchVariableName(),
  }));

const matchHSLColor = (): GradientColor | undefined =>
  matchCall(tokens.hslColor, () => {
    const lookahead = scan(tokens.percentageValue);
    if (lookahead) {
      error(
        'HSL hue value must be a number in degrees (0-360) or normalized (-360 to 360), not a percentage',
      );
    }

    const hue = matchNumber();
    scan(tokens.comma);
    let captures = scan(tokens.percentageValue);
    const sat = captures ? captures[1] : null;
    scan(tokens.comma);
    captures = scan(tokens.percentageValue);
    const light = captures ? captures[1] : null;
    const ensuredSat =
      sat ?? error('Expected percentage value for saturation and lightness in HSL');
    const ensuredLight =
      light ?? error('Expected percentage value for saturation and lightness in HSL');
    return {
      type: 'hsl' as const,
      value: [hue, ensuredSat, ensuredLight] as [string, string, string],
    };
  });

const matchHSLAColor = (): GradientColor | undefined =>
  matchCall(tokens.hslaColor, () => {
    const hue = matchNumber();
    scan(tokens.comma);
    let captures = scan(tokens.percentageValue);
    const sat = captures ? captures[1] : null;
    scan(tokens.comma);
    captures = scan(tokens.percentageValue);
    const light = captures ? captures[1] : null;
    scan(tokens.comma);
    const alpha = matchNumber();
    const ensuredSat =
      sat ?? error('Expected percentage value for saturation and lightness in HSLA');
    const ensuredLight =
      light ?? error('Expected percentage value for saturation and lightness in HSLA');
    return {
      type: 'hsla' as const,
      value: [hue, ensuredSat, ensuredLight, alpha] as [string, string, string, string],
    };
  });

const matchVariableName = (): string => {
  const captures = scan(tokens.variableName) ?? error('Expected CSS variable name');
  return captures[1];
};

const matchNumber = (): string => {
  const captures = scan(tokens.number) ?? error('Expected number');
  return captures[1];
};

const matchDistance = (): GradientDistance | undefined =>
  match('%', tokens.percentageValue, 1) ||
  match('position-keyword', tokens.positionKeywords, 1) ||
  matchCalc() ||
  matchLength();

const matchCalc = (): GradientDistance | undefined =>
  matchCall(tokens.calcValue, () => {
    let openParenCount = 1;
    let index = 0;

    while (openParenCount > 0 && index < input.length) {
      const char = input.charAt(index);
      if (char === '(') openParenCount++;
      else if (char === ')') openParenCount--;
      index++;
    }

    if (openParenCount > 0) {
      error('Missing closing parenthesis in calc() expression');
    }

    const calcContent = input.slice(0, index - 1);
    consume(index - 1);

    return { type: 'calc' as const, value: calcContent };
  });

const matchLength = (): GradientDistance | undefined =>
  match('px', tokens.pixelValue, 1) || match('em', tokens.emValue, 1);

const match = <TType extends string>(
  type: TType,
  pattern: RegExp,
  captureIndex: number,
): { type: TType; value: string } | undefined => {
  const captures = scan(pattern);
  if (!captures) return undefined;
  return { type, value: captures[captureIndex] };
};

const scan = (regexp: RegExp): RegExpExecArray | null => {
  const blankCaptures = /^[\n\r\t\s]+/.exec(input);
  if (blankCaptures) consume(blankCaptures[0].length);

  const captures = regexp.exec(input);
  if (captures) consume(captures[0].length);

  return captures;
};

const consume = (size: number): void => {
  input = input.slice(size);
};

/** Parse one or more comma-separated CSS gradient definitions. Throws on invalid input. */
export const parseGradient = (code: string): Array<GradientAst> => {
  input = code.toString().trim();
  if (input.endsWith(';')) {
    input = input.slice(0, -1);
  }
  return getAst();
};
