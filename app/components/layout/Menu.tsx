import clsx from "clsx";
import { Link } from "@remix-run/react";
import navItems from "./nav-items.json";

// xxx: overflows but maybe on chrome mobile emulator only?
export function Menu({
  expanded,
  closeMenu,
}: {
  expanded: boolean;
  closeMenu: () => void;
}) {
  return (
    <div className={clsx("layout__menu", { expanded })}>
      <div className="layout__menu__links">
        {navItems.map((navItem, i) => (
          <Link
            key={navItem.name}
            className={clsx("layout__menu__link", {
              first: i === 0,
              last: i + 1 === navItems.length,
            })}
            to={navItem.url ?? navItem.name}
            onClick={closeMenu}
            data-cy={`menu-link-${navItem.name}`}
          >
            <img
              className="layout__menu__link__icon"
              src={`/img/layout/${navItem.name.replace(" ", "")}.webp`}
              alt={navItem.name}
            />
            <div>{navItem.displayName ?? navItem.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}