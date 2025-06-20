export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
      {/* Patrón de fondo decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-16">
        {/* Sección principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo y descripción */}
          <div className="lg:col-span-2">
            <a
              href="https://mundonlinebooks.vercel.app"
              className="inline-flex items-center space-x-3 mb-6 group"
            >
              <div className="relative">
                <img
                  src="/MundonlineLogo.png"
                  className="h-16 w-16 rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105"
                  alt="Mundonline Logo"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Mundonline
                </span>
                <p className="text-sm text-gray-300 mt-1">Books</p>
              </div>
            </a>

            <p className="text-gray-300 text-base leading-relaxed mb-6 max-w-md">
              Tu biblioteca digital favorita. Descubre, compra y disfruta de
              miles de libros electrónicos de la mejor calidad, disponibles las
              24 horas del día.
            </p>

            {/* Redes sociales */}
            <div className="flex space-x-4">
              <SocialLink href="#" icon="facebook" />
              <SocialLink href="#" icon="twitter" />
              <SocialLink href="#" icon="instagram" />
              <SocialLink href="#" icon="linkedin" />
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 relative">
              Enlaces Rápidos
              <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/" text="Inicio" />
              <FooterLink href="/categorias" text="Catálogo" />
              <FooterLink href="/about" text="Acerca de" />
            </ul>
          </div>

          {/* Soporte y legal */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 relative">
              Soporte y Legal
              <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/privacy" text="Política de Privacidad" />
              <FooterLink href="/licensing" text="Licencias" />
              <FooterLink href="/Contact" text="Centro de Soporte" />
            </ul>
          </div>
        </div>

        {/* Separador */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-300 text-sm">
                © 2025{" "}
                <a
                  href="https://mundonlinebooks.vercel.app"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                >
                  MundonlineBooks
                </a>
                . Todos los derechos reservados.
              </p>
            </div>

            {/* Métodos de pago */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">Pagos seguros:</span>
              <div className="flex space-x-2">
                <PaymentIcon type="visa" />
                <PaymentIcon type="mastercard" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Componente para enlaces del footer
function FooterLink({ href, text }) {
  return (
    <li>
      <a
        href={href}
        className="text-gray-300 hover:text-white transition-colors duration-200 text-sm flex items-center group"
      >
        <span className="w-0 group-hover:w-2 h-0.5 bg-blue-400 rounded-full transition-all duration-200 mr-0 group-hover:mr-2"></span>
        {text}
      </a>
    </li>
  );
}

// Componente para redes sociales
function SocialLink({ href, icon }) {
  const icons = {
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
    ),
    instagram: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.324-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.417-3.324c.926-.876 2.027-1.297 3.324-1.297s2.448.49 3.324 1.297c.926.876 1.417 2.027 1.417 3.324s-.49 2.448-1.417 3.244c-.876.926-2.027 1.297-3.324 1.297zm7.83-2.48c-.49.926-1.297 1.567-2.374 1.835-.551.134-1.103.2-1.654.2-.551 0-1.103-.066-1.654-.2-1.077-.268-1.885-.909-2.374-1.835-.268-.49-.402-1.103-.402-1.654 0-.551.134-1.164.402-1.654.49-.926 1.297-1.567 2.374-1.835.551-.134 1.103-.2 1.654-.2.551 0 1.103.066 1.654.2 1.077.268 1.885.909 2.374 1.835.268.49.402 1.103.402 1.654 0 .551-.134 1.164-.402 1.654z" />
      </svg>
    ),
    linkedin: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
    >
      {icons[icon]}
    </a>
  );
}

// Componente para iconos de métodos de pago
function PaymentIcon({ type }) {
  const icons = {
    visa: (
      <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">VISA</span>
      </div>
    ),
    mastercard: (
      <div className="w-20 h-5 bg-red-600 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">MasterCard</span>
      </div>
    ),
  };

  return (
    <div className="opacity-70 hover:opacity-100 transition-opacity duration-200">
      {icons[type]}
    </div>
  );
}
