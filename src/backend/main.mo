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

  // OrderItem does NOT include amount — amount stored separately to avoid migration issues
  type OrderItem = {
    name : Text;
    qty : Text;
  };

  // Item amount stored in separate stable map to avoid migration compatibility issues
  type ItemAmount = {
    name : Text;
    amount : Text;
  };

  // Updated OrderStatus type with billDone
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
  };

  let orders = Map.empty<Nat, Order>();
  var nextOrderId = 1;

  // Separate stable map for item amounts — new variable, no migration needed
  let orderAmounts = Map.empty<Nat, [ItemAmount]>();

  // Custom role types for manager and driver
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

  public shared ({ caller }) func submitOrder(
    quarry : Text,
    address : Text,
    blaster : Text,
    lease : Text,
    dgms : Text,
    date : Text,
    items : [OrderItem],
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit orders");
    };

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

  public query ({ caller }) func getOrdersByBlaster(blaster : Text, date : Text) : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };

    orders.values().toArray().filter(
      func(order) {
        order.blaster.toLower().contains(#text (blaster.toLower())) and order.date == date
      }
    );
  };

  // No authorization check - accessible to anyone including anonymous callers
  // Access is gated by password on the frontend (driver123 / manager123)
  public query func getAllOrders() : async [Order] {
    orders.values().toArray();
  };

  // Returns orders with their item amounts merged — for manager and office panels
  public query func getAllOrdersWithAmounts() : async [OrderWithAmounts] {
    orders.values().toArray().map(
      func(order : Order) : OrderWithAmounts {
        let amounts = switch (orderAmounts.get(order.id)) {
          case (?a) { a };
          case (null) { [] };
        };
        { order; amounts };
      }
    );
  };

  // Save item amounts for an order (manager only, no auth — gated by frontend password)
  public shared func updateItemAmounts(orderId : Nat, amounts : [ItemAmount]) : async () {
    let _ = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?o) { o };
    };
    orderAmounts.add(orderId, amounts);
  };

  // No authorization check - any caller can update status
  // Access is gated by password on the frontend
  // CRITICAL: Enforces correct status flow: accepted → billDone → delivered
  public shared func updateOrderStatus(orderId : Nat, newStatus : OrderStatus) : async () {
    let order = switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { order };
    };

    // Enforce valid status transitions per specification
    // CRITICAL: billDone must come BEFORE delivered
    switch (order.status, newStatus) {
      case (#pending, #approved) {};
      case (#pending, #rejected) {};
      case (#approved, #accepted) {};
      case (#accepted, #billDone) {}; // Office marks bill done first
      case (#billDone, #delivered) {}; // Driver delivers only after bill is done
      case (_) { Runtime.trap("Invalid status transition") };
    };

    let updatedOrder : Order = {
      order with
      status = newStatus;
    };

    orders.add(orderId, updatedOrder);
  };

  // ANY order status can have items updated (NO status restriction)
  // Authorization added: requires user permission to prevent anonymous modification
  public shared ({ caller }) func updateOrderItems(orderId : Nat, items : [OrderItem]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update order items");
    };

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

  public query ({ caller }) func getOrderById(orderId : Nat) : async ?Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };

    orders.get(orderId);
  };
};
