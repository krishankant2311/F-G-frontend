import React, { createContext, useState, useContext } from 'react';

// Create a context
const TableContext = createContext();

// Provider component
export const TableProvider = ({ children }) => {
  const [tableSize, setTableSize] = useState(250); // Default size
  // const [adminMenu, setAdminMenu] = useState(null);

  const handleTableSize = () => {
    if(tableSize === 250){
        setTableSize(90);
    }else{
        setTableSize(250);
    }
  };

  return (
    <TableContext.Provider value={{ tableSize, handleTableSize }}>
      {children}
    </TableContext.Provider>
  );
};

// Custom hook to use the TableContext
export const useTableContext = () => {
  return useContext(TableContext);
};
