

import React, { FC, useState } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { useNavigate, Link } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization } from '../types.ts';
import { Award, BookOpen, CheckCircle, Clock, HelpCircle, History, PlayCircle, ShoppingCart } from 'lucide-react';
import Spinner from './Spinner.tsx';

export interface ExamCardProps {
    exam: Exam;
    programId: string;
    isPractice: boolean;
    isPurchased: boolean;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    hideDetailsLink?: boolean;
    attemptsMade?: number;
    isDisabled?: boolean;
}

const decodeHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for decoding", e);
        return html;
    }
};

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        return html;
    }
};

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, activeOrg, examPrices, hideDetailsLink = false, attemptsMade, isDisabled = false }) => {
    const navigate = useNavigate();
    const { user, token, isSubscribed, isBetaTester } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const canTake = isPractice || isPurchased || isSubscribed || isBetaTester;
    
    const priceInfo = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
    const price = priceInfo?.price ?? (exam.price || 0);
    const regularPrice = priceInfo?.regularPrice ?? (exam.regularPrice || 0);
    
    let buttonText = 'Start Practice';
    if (!isPractice) {
        if (canTake) {
            buttonText = 'Start Exam';
        } else {
            buttonText = isRedirecting ? 'Preparing...' :