import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Order {
    id: bigint;
    status: OrderStatus;
    blaster: string;
    date: string;
    dgms: string;
    createdAt: bigint;
    lease: string;
    address: string;
    items: Array<OrderItem>;
    quarry: string;
}
export interface UserProfile {
    name: string;
}
export interface OrderItem {
    qty: string;
    name: string;
}
export enum OrderStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected",
    delivered = "delivered",
    accepted = "accepted"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignDriverRole(user: Principal): Promise<void>;
    assignManagerRole(user: Principal): Promise<void>;
    getAllOrders(): Promise<Array<Order>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrderById(orderId: bigint): Promise<Order | null>;
    getOrdersByBlaster(blaster: string, date: string): Promise<Array<Order>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitOrder(quarry: string, address: string, blaster: string, lease: string, dgms: string, date: string, items: Array<OrderItem>): Promise<bigint>;
    updateOrderItems(orderId: bigint, items: Array<OrderItem>): Promise<void>;
    updateOrderStatus(orderId: bigint, newStatus: OrderStatus): Promise<void>;
}
