import { Outlet, Link } from "react-router-dom";
import { APP_NAME, ROUTES } from "@mysheet/constants";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#1d272d] via-[#2a1848] to-primary">
      <header className="px-6 py-5">
        <Link to={ROUTES.login} className="text-2xl font-bold tracking-tight text-white">
          {APP_NAME}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
