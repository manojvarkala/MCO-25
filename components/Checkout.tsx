import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import Spinner from './Spinner.tsx';

const Checkout: React.FC = () => {
    const { productSlug } = ReactRouterDOM.useParams<{ productSlug: string }>();

    React.useEffect(() => {
        if (productSlug) {
            const redirectTimer = setTimeout(() => {
                const checkoutUrl = `https://www.coding-online.net/product/${productSlug}/`;
                window.location.href = checkoutUrl;
            }, 2000); // 2-second delay before redirecting

            return () => clearTimeout(redirectTimer);
        }
    }, [productSlug]);

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Preparing Your Checkout</h2>
                <Spinner />
                <p className="text-slate-500">
                    You are being redirected to our main store to complete your purchase securely.
                </p>
                {!productSlug && (
                    <p className="text-red-500">
                        Error: No product specified for checkout.
                    </p>
                )}
            </div>
        </div>
    );
};

export default Checkout;