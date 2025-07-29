declare module 'react-native-html-to-pdf' {
  interface Options {
    html: string;
    fileName?: string;
    directory?: string;
    height?: number;
    width?: number;
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    bgColor?: string;
    base64?: boolean;
  }

  interface Pdf {
    filePath?: string;
    base64?: string;
    numberOfPages?: number;
  }

  export function convert(options: Options): Promise<Pdf>;
}