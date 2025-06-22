import { useState, useEffect } from "react";
import { useCartStore } from "../lib/cartStore";
import { supabase } from "../lib/supabaseClient";

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Estados para cupones
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
          setUser(data.session.user);
          console.log("✅ Usuario autenticado:", {
            id: data.session.user.id,
            email: data.session.user.email,
          });
        } else {
          console.log("❌ No hay sesión activa");
        }
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    getSession();
  }, []);

  // Función para validar cupón
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Ingresa un código de cupón");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Mapear códigos de cupón a IDs de Stripe
      const couponMapping = {
        BIENVENIDA25: "bienvenida25", // Código mostrado al usuario -> ID en Stripe
        // Agrega más mapeos aquí si tienes más cupones
      };

      const stripeId =
        couponMapping[couponCode.trim().toUpperCase()] ||
        couponCode.trim().toLowerCase();

      const response = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode: stripeId, // Enviar el ID de Stripe, no el código de display
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error validando cupón");
      }

      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
        console.log("✅ Cupón aplicado:", data.coupon);
      } else {
        throw new Error("Cupón inválido o expirado");
      }
    } catch (err) {
      console.error("❌ Error validando cupón:", err);
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  // Función para remover cupón
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Calcular descuento
  const calculateDiscount = () => {
    if (!appliedCoupon) return { discount: 0, newTotal: total };

    const subtotal = total;
    let discount = 0;

    if (appliedCoupon.percent_off) {
      // Descuento porcentual
      discount = (subtotal * appliedCoupon.percent_off) / 100;
    } else if (appliedCoupon.amount_off) {
      // Descuento fijo (convertir de centavos a euros)
      discount = appliedCoupon.amount_off / 100;
    }

    // Asegurar que el descuento no sea mayor que el total
    discount = Math.min(discount, subtotal);
    const newTotal = Math.max(0, subtotal - discount);

    return { discount, newTotal };
  };

  const handleCheckout = async () => {
    console.log("🚀 Iniciando proceso de checkout...");

    if (!userId) {
      console.log("❌ Usuario no autenticado");
      setShowLoginModal(true);
      return;
    }

    if (!items || items.length === 0) {
      console.log("❌ Carrito vacío");
      setError("El carrito está vacío");
      return;
    }

    console.log("📦 Items en el carrito:", items);

    setLoading(true);
    setError(null);

    try {
      // Validar datos antes de enviar
      const validItems = items.filter((item) => {
        const isValid = item.id && item.name && item.price && item.quantity;
        if (!isValid) {
          console.warn("⚠️ Item inválido encontrado:", item);
        }
        return isValid;
      });

      if (validItems.length === 0) {
        throw new Error("No hay artículos válidos en el carrito");
      }

      const requestData = {
        items: validItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
        })),
        customerId: userId,
        // Incluir información del cupón si está aplicado
        coupon: appliedCoupon
          ? {
              id: appliedCoupon.id, // Este será 'bienvenida25'
              code: "bienvenida25", // Usar el ID de Stripe, no el código de display
              percent_off: appliedCoupon.percent_off,
              amount_off: appliedCoupon.amount_off,
            }
          : null,
      };

      console.log("📤 Enviando datos al servidor:", requestData);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("📥 Respuesta del servidor:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
      });

      if (!res.ok) {
        let errorMessage = `Error ${res.status}: ${res.statusText}`;

        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          console.error("❌ Error del servidor:", errorData);
        } catch (parseError) {
          console.error(
            "❌ No se pudo parsear la respuesta de error:",
            parseError
          );
        }

        throw new Error(errorMessage);
      }

      const responseData = await res.json();
      console.log("✅ Respuesta exitosa:", responseData);

      const { url, error: apiError } = responseData;

      if (apiError) {
        throw new Error(apiError);
      }

      if (!url) {
        throw new Error("No se recibió URL de pago del servidor");
      }

      console.log("🔄 Limpiando carrito...");
      clearCart();

      console.log("🔗 Redirigiendo a Stripe:", url);
      window.location.href = url;
    } catch (err) {
      console.error("❌ Error completo en checkout:", err);
      setError(err.message || "Error al procesar el pago. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const { discount, newTotal } = calculateDiscount();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h4"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Tu carrito está vacío
              </h1>
              <p className="text-gray-600 mb-8">
                Agrega algunos libros a tu carrito antes de proceder al
                checkout.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Explorar libros
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gray-800">Finalizar </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Compra
            </span>
          </h1>
          <p className="text-gray-600">
            Revisa tu pedido y procede al pago de forma segura
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resumen del pedido */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Resumen del pedido
              </h2>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-20 object-cover rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="flex-grow min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        €{item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección de cupón */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Código de descuento
              </h3>

              {!appliedCoupon ? (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Ingresa tu código"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      disabled={couponLoading}
                      onKeyPress={(e) => e.key === "Enter" && validateCoupon()}
                    />
                    <button
                      onClick={validateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {couponLoading ? (
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        "Aplicar"
                      )}
                    </button>
                  </div>

                  {couponError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                        {couponError}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">
                        Cupón aplicado: {couponCode}
                      </p>
                      <p className="text-sm text-green-600">
                        {appliedCoupon.percent_off
                          ? `${appliedCoupon.percent_off}% de descuento`
                          : `€${(appliedCoupon.amount_off / 100).toFixed(2)} de descuento`}
                      </p>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-green-700 p-1"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Información del usuario */}
            {user && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Información de cuenta
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-green-800 font-medium">
                      Sesión iniciada como: {user.email}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel de pago */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Total del pedido
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} artículos)</span>
                  <span>€{total.toFixed(2)}</span>
                </div>

                {appliedCoupon && discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        ></path>
                      </svg>
                      Descuento ({couponCode})
                    </span>
                    <span>-€{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span className="text-green-600 font-medium">Gratis</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos</span>
                  <span>Incluidos</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span className={discount > 0 ? "text-green-600" : ""}>
                      €{newTotal.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="text-sm text-gray-500 text-right">
                      <span className="line-through">€{total.toFixed(2)}</span>
                      <span className="ml-2 text-green-600 font-medium">
                        Ahorras €{discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-red-800 text-sm">
                      <div className="font-medium mb-1">Error de pago</div>
                      <div>{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de pago */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-white transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    {appliedCoupon
                      ? `Pagar €${newTotal.toFixed(2)} con Stripe`
                      : "Pagar con Stripe"}
                  </>
                )}
              </button>

              {/* Información de seguridad */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 mr-2 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Pago 100% seguro con encriptación SSL
                </div>
              </div>

              {/* Enlaces adicionales */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href="/cart"
                  className="block text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Volver al carrito
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de login */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Iniciar sesión requerido
                </h3>
                <p className="text-gray-600">
                  Debes iniciar sesión para proceder con el pago.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <a
                  href="/login"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Iniciar sesión
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
