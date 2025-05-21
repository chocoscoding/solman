import React from "react";
import PresalePage from "./client";
import { getRowById, subscribeToChanges, upsertSaleDates, upsertTotalDeposit } from "@/actions/presale-actions";
const Page = async () => {
  const data = await getRowById(1);
  return (
    <>
      <PresalePage
        initData={data}
        getRowById={getRowById}
        subscribeToChanges={subscribeToChanges}
        upsertSaleDates={upsertSaleDates}
        upsertTotalDeposit={upsertTotalDeposit}
      />
    </>
  );
};

export default Page;
