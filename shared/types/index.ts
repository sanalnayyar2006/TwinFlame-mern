export interface User{
    id:string;
    name:string;
    email:string;
    coupleCode:string;
    partnerId?:string;
    createdAt:Date;
}

export interface AuthResponse{
    token:string;
    user: User;
}

export interface ApiError{
    message:string;
    status:number;
}