import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import dataApi from 'src/frontend/data/api';
import { useQuery } from 'react-query';

const QUERY_KEY_DATA_ITEM = `dataItem`;

export default function DataView(){
  const urlParams = useParams();
  const windowId = urlParams.windowId as string;
  const {data, isLoading} = useQuery([QUERY_KEY_DATA_ITEM, windowId], () => dataApi.getDataItem(windowId));

  const onShowRecordDetails = (rowData: any) => {
    // TODO:
    console.log(rowData)
  };

  const rowContextOptions = [
    {
      label: 'Show Details',
      onClick: onShowRecordDetails,
    },
  ];

  if(isLoading){
    return <>Loading...</>
  }

  if(!data){
    return <>No data...</>
  }

  return <DataTableWithJSONList
        onRowClick={onShowRecordDetails}
        rowContextOptions={rowContextOptions}
        data={data.values}
        searchInputId='result-box-search-input'
        enableColumnFilter={true}
      />
}
