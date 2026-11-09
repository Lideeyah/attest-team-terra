"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { recordArrive, recordList } from "@/lib/motion";

type RecordListProps<Item> = {
  items: Item[];
  itemKey: (item: Item) => string;
  children: (item: Item) => ReactNode;
};

/** Rows arriving and stacking, staggered by one frame. This is how a
    disbursement run feels like money accruing rather than a table loading. */
export function RecordList<Item>({
  items,
  itemKey,
  children,
}: RecordListProps<Item>) {
  return (
    <motion.ul variants={recordList} initial="rest" animate="shown">
      {items.map((item) => (
        <motion.li key={itemKey(item)} variants={recordArrive}>
          {children(item)}
        </motion.li>
      ))}
    </motion.ul>
  );
}
