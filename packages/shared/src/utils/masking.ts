export const maskString = (param: string) =>
    param.length <= 1 ? param : param[0] + '*'.repeat(param.length - 1);