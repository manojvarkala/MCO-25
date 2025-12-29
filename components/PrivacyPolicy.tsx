


import React, { FC } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { Link } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';

const PrivacyPolicy: FC = () => {
    const { activeOrg } = useAppContext();
    const orgName = activeOrg ? activeOrg.name : 'Our Company';

    return (
        <div className="max-w-4xl mx-auto bg-white p-