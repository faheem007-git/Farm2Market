import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useOrders } from "../../hooks/useOrders";
import { Button, Card, EmptyState, PageHeader, StatusIndicator } from "../../components/common/ui";
import { OrderTimeline } from "../../components/domain/cards";
import { TrackingTimeline } from "../../components/domain/matchScore";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { orders, setStatus } = useOrders();
  const { user } = useAuth();
  const { startThread } = useChat();
  const navigate = useNavigate();

  const found = orders.find((o) => o.id === orderId);
  // Buyers can only open their own orders.
  const order = found && (!user || found.buyerId === user.id) ? found : undefined;

  async function chat() {
    if (!user || !order) return;
    const conv = await startThread(
      user.id,
      user.company,
      order.supplierId,
      order.supplierName,
      `${order.id} · ${order.quantityKg.toLocaleString("en-IN")} kg ${order.produceName}`
    );
    navigate(`/buyer/chat/${conv.id}`);
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        <EmptyState title="Unknown order" body="It may have been cleared with demo data." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${order.id} · ${order.produceName}`}
        subtitle={`${order.supplierName} → ${order.deliveryLocation}`}
        actions={
          <>
            <Button variant="secondary" onClick={chat}>
              <MessageCircle size={16} /> Chat
            </Button>
            {order.status === "placed" && (
              <Button
                variant="danger"
                onClick={() => setStatus(order.id, "cancelled", `Request withdrawn by ${order.buyerCompany}`)}
              >
                Cancel request
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Summary</h2>
            <StatusIndicator status={order.status} />
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">Supplier</dt><dd className="font-medium"><Link className="text-brand-700 hover:underline" to={`/buyer/suppliers/${order.supplierId}`}>{order.supplierName}</Link></dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Product</dt><dd className="font-medium">{order.produceName} · Grade {order.grade}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Quantity</dt><dd className="font-medium">{order.quantityKg.toLocaleString("en-IN")} kg</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Price</dt><dd className="font-medium">₹{order.pricePerKg}/kg</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Total</dt><dd className="font-bold text-brand-800">₹{order.totalAmount.toLocaleString("en-IN")}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Destination</dt><dd className="font-medium">{order.deliveryLocation}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Order date</dt><dd className="font-medium">{order.createdAt}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Expected delivery</dt><dd className="font-medium">{order.expectedDelivery}</dd></div>
          </dl>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Tracking</h2>
          <div className="mt-3"><TrackingTimeline order={order} /></div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Event history</h2>
          <OrderTimeline order={order} />
        </Card>
      </div>

      <p className="mt-4 text-sm">
        <Link to="/buyer/orders" className="font-medium text-brand-700 hover:underline">← Back to Orders</Link>
      </p>
    </div>
  );
}
