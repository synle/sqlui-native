import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import dataApi from 'src/frontend/data/api';
import {useDataItem} from 'src/frontend/hooks/useDataItem'

export default function DataView(){
  const urlParams = useParams();
  const windowId = urlParams.windowId as string;

  const {data, isLoading} = useDataItem(windowId);

  const onShowRecordDetails = (rowData: any) => {
    // TODO:
    console.log(rowData)
  };

  const rowContextOptions = [
    // TODO:
    // {
    //   label: 'Show Details',
    //   onClick: onShowRecordDetails,
    // },
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
        data={data}
        searchInputId='result-box-search-input'
        enableColumnFilter={true}
      />
}
