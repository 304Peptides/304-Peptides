import AdminRecordsManager from "./AdminRecordsManager";

function OrderManager({
  orders = [],
  onNavigate = () => {},
}) {
  return (
    <AdminRecordsManager
      mode="orders"
      orders={orders}
      onNavigate={onNavigate}
    />
  );
}

export default OrderManager;
