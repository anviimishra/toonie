import type { ComponentType, SVGProps } from "react";

type Props = {
  title: string;
  body: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Temporary stand-in for a tab whose screen is still being built. */
export function ComingSoon({ title, body, Icon }: Props) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
      <span className="grid size-24 place-items-center rounded-[28px] bg-white text-orange-500 shadow-card ring-1 ring-orange-100">
        <Icon className="size-11" />
      </span>
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-stone-500">{body}</p>
      </div>
    </section>
  );
}
