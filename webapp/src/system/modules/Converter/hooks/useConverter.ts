
export interface Converter {
    convert: (from: string, to: string, value: number, params: any) => number;
}

const useConverter = ():Converter=>{
    return {
        convert: (from, to, value, params) => 0
    }
}