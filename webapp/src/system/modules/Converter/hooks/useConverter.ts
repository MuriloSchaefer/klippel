export type Converter = {
    convert: (from: string, to: string, value: number, params: any) => number;
}

export const useConverter = ():Converter=>{
  

    return {
        convert: (from, to, value, params) => 0
    }
}

export default useConverter