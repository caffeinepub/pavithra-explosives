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
export interface ItemAmount {
    name: string;
    amount: string;
}
export interface ItemNote {
    name: string;
    note: string;
}
export interface OrderWithAmounts {
    order: Order;
    amounts: Array<ItemAmount>;
    notes: Array<ItemNote>;
    driverName: string;
    vehicleNumber: string;
}
export enum OrderStatus {
    pending = "pending",
    billDone = "billDone",
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
    acceptOrderWithDriver(orderId: bigint, driverName: string): Promise<void>;
    approveOrderWithVehicle(orderId: bigint, vehicleNumber: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignDriverRole(user: Principal): Promise<void>;
    assignManagerRole(user: Principal): Promise<void>;
    getAllDriverNames(): Promise<Array<[bigint, string]>>;
    getAllOrders(): Promise<Array<Order>>;
    getAllOrdersWithAmounts(): Promise<Array<OrderWithAmounts>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrderById(orderId: bigint): Promise<Order | null>;
    getOrdersByBlaster(blaster: string, date: string): Promise<Array<Order>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitOrder(quarry: string, address: string, blaster: string, lease: string, dgms: string, date: string, items: Array<OrderItem>): Promise<bigint>;
    updateItemAmounts(orderId: bigint, amounts: Array<ItemAmount>): Promise<void>;
    updateItemNotes(orderId: bigint, notes: Array<ItemNote>): Promise<void>;
    updateOrderItems(orderId: bigint, items: Array<OrderItem>): Promise<void>;
    updateOrderStatus(orderId: bigint, newStatus: OrderStatus): Promise<void>;
}
