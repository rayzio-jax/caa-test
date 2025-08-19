import { Source_Code_Pro } from "next/font/google";
import Link from "next/link";

const SCodePro = Source_Code_Pro({ weight: ["200", "300", "400", "500", "600", "700", "800", "900"], subsets: ["latin"] });

export default function Home() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <p className="inline-flex items-center gap-2">
                Welcome, hit{" "}
                <Link href="/api/" className={`${SCodePro.className} text-white bg-black dark:bg-white dark:text-black p-1 rounded-md`}>
                    /api/:endpoint
                </Link>{" "}
                to start using.
            </p>
        </div>
    );
}
