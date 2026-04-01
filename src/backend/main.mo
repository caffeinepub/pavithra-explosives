import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Apply migration with with clause
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  type OrderItem = {
    name : Text;
    qty : Text;
  };

  type ItemAmount = {
    name : Text;
    amount : Text;
  };

  type ItemNote = {
    name : Text;
    note : Text;
  };

  type OrderStatus = {
    #pending;
    #approved;
    #rejected;
    #accepted;
    #delivered;
    #billDone;
  };

  type Order = {
    id : Nat;
    quarry : Text;
    address : Text;
    blaster : Text;
    lease : Text;
    dgms : Text;
    date : Text;
    items : [OrderItem];
    status : OrderStatus;
    createdAt : Int;
  };

  type OrderWithAmounts = {
    order : Order;
    amounts : [ItemAmount];
    notes : [ItemNote];
    driverName : Text;
    vehicleNumber : Text;
  };

  let orders = Map.empty<Nat, Order>();
  var nextOrderId = 1;

  let orderAmounts = Map.empty<Nat, [ItemAmount]>();
  let orderDriverNames = Map.empty<Nat, Text>();
  let orderVehicleNumbers = Map.empty<Nat, Text>();
  let orderNotes = Map.empty<Nat, [ItemNote]>();

  let managerRole = Map.empty<Principal, Bool>();
  let driverRole = Map.empty<Principal, Bool>();

  public shared ({ caller }) func assignManagerRole(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign manager role");
    };
    managerRole.add(user, true);
  };

  public shared ({ caller }) func assignDriverRole(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign driver role");
    };
    driverRole.add(user, true);
  };

  func validateNotEmpty(text : Text, fieldName : Text) {
    if (text.isEmpty()) { Runtime.trap(fieldName # " must not be empty") };
  };

  func validateOrderData(quarry : Text, address : Text, blaster : Text, lease : Text, dgms : Text, date : Text) {
    validateNotEmpty(quarry, "Quarry");
    validateNotEmpty(address, "Address");
    validateNotEmpty(blaster, "Blaster");
    validateNotEmpty(lease, "Lease");
    validateNotEmpty(dgms, "DGMS");
    validateNotEmpty(date, "Date");
  };

  func hasActiveOrderForBlasterOnDate(blaster : Text, date : Text) : Bool {
    for (order in orders.values()) {
      if (order.blaster.toLower() == blaster.toLower() and order.date == date) {
        switch (order.status) {
          case (#pending or #approved or #accepted) { return true };
          case (_) {};
        };
      };
    };
    false;
  };

  public shared func submitOrder(
    quarry : Text,
    address : Text,
    blaster : Text,
    lease : Text,
    dgms : Text,
    date : Text,
    items : [OrderItem],
  ) : async Nat {
    validateOrderData(quarry, address, blaster, lease, dgms, date);

    if (hasActiveOrderForBlasterOnDate(blaster, date)) {
      Runtime.trap("Active order exists for this blaster and date");
    };

    let order : Order = {
      id = nextOrderId;
      quarry;
      address;
      blaster;
      lease;
      dgms;
      date;
      items;
      status = #pending;
      createdAt = Time.now();
    };

    orders.add(nextOrderId, order);
    nextOrderId += 1;

    order.id;
  };

  public query func getOrdersByBlaster(blaster : Text, date : Text) : async [Order] {
    orders.values().toArray().filter(
      func(order) {
        order.blaster.toLower().contains(#text (blaster.toLower())) and order.date == date
      }
    );
  };

  public query func getAllOrders() : async [Order] {
    orders.values().toArray();
  };

  public query func getAllOrdersWithAmounts() : async [OrderWithAmounts] {
    orders.values().toArray().map(
      func(order : Order) : OrderWithAmounts {
        let amounts = switch (orderAmounts.get(order.id)) {
          case (?a) { a };
          case (null) { [] };
        };
        let driverName = switch (orderDriverNames.get(order.id)) {
          case (?n) { n };
          case (null) { "" };
        };
        let vehicleNumber = switch (orderVehicleNumbers.get(order.id)) {
          case (?v) { v };
          case (null) { "" };
        };
        let notes = switch (orderNotes.get(order.id)) {
          case (?n) { n };
          case (null) { [] };
        };
        { order; amounts; notes; driverName; vehicleNumber };
      }
    );
  };

  public query func getAllDriverNames() : async [(Nat, Text)] {
    orderDriverNames.entries().toArray();
  };

  public shared func updateItemAmounts(orderId : Nat, amounts : [ItemAmount]) : async () {
    let _ = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };
    orderAmounts.add(orderId, amounts);
  };

  public shared func updateItemNotes(orderId : Nat, notes : [ItemNote]) : async () {
    let _ = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };
    orderNotes.add(orderId, notes);
  };

  // Approve order with vehicle number — manager must enter vehicle number on approval
  public shared func approveOrderWithVehicle(orderId : Nat, vehicleNumber : Text) : async () {
    let order = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };

    switch (order.status) {
      case (#pending) {};
      case (_) { Runtime.trap("Order must be pending to approve") };
    };

    validateNotEmpty(vehicleNumber, "Vehicle number");

    let updatedOrder : Order = {
      order with
      status = #approved;
    };
    orders.add(orderId, updatedOrder);
    orderVehicleNumbers.add(orderId, vehicleNumber);
  };

  public shared func acceptOrderWithDriver(orderId : Nat, driverName : Text) : async () {
    let order = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };

    switch (order.status) {
      case (#approved) {};
      case (_) { Runtime.trap("Order must be in approved status to accept") };
    };

    validateNotEmpty(driverName, "Driver name");

    let updatedOrder : Order = {
      order with
      status = #accepted;
    };
    orders.add(orderId, updatedOrder);
    orderDriverNames.add(orderId, driverName);
  };

  public shared func updateOrderStatus(orderId : Nat, newStatus : OrderStatus) : async () {
    let order = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { order };
    };

    switch (order.status, newStatus) {
      case (#pending, #approved) {};
      case (#pending, #rejected) {};
      case (#approved, #rejected) {};
      case (#accepted, #billDone) {};
      case (#billDone, #delivered) {};
      case (_) { Runtime.trap("Invalid status transition") };
    };

    let updatedOrder : Order = {
      order with
      status = newStatus;
    };

    orders.add(orderId, updatedOrder);
  };

  public shared func updateOrderItems(orderId : Nat, items : [OrderItem]) : async () {
    let order = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { order };
    };

    let updatedOrder : Order = {
      order with
      items;
    };

    orders.add(orderId, updatedOrder);
  };

  public query func getOrderById(orderId : Nat) : async ?Order {
    orders.get(orderId);
  };
};
