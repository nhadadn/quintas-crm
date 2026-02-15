import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center">
            <Image
              src="/logo.png"
              alt="Quintas de Otinapa"
              width={180}
              height={180}
              className="mb-8"
              priority
            />
            {children}
          </div>
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Quintas de Otinapa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
