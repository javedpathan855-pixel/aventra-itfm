"use client";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "next/navigation";

const ShowcaseHeader = () => {
  const router = useRouter();

  const handlePlaygroundNavigation = () => {
    router.push("/showcase/playoground");
  };
  return (
    <header className="flex flex-row items-center justify-between p-6">
      <div className="flex flex-col">
        <h1 className="font-semibold text-2xl">Aventra</h1>
        <p className="text-sm">IT Facility Management</p>
      </div>
      <Button onClick={handlePlaygroundNavigation}>Playground</Button>
    </header>
  );
};

export default ShowcaseHeader;
