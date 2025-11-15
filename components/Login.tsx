




import React, { FC, useRef, useEffect } from 'react';
// FIX: Replaced `useHistory` with `useNavigate` for react-router-dom v6.
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { useLocation, useNavigate