import { GoogleLogin } from "@react-oauth/google";

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: () => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={(response) => response.credential ? onSuccess(response.credential) : onError()}
        onError={onError}
        useOneTap={false}
        text="signin_with"
        shape="rectangular"
        width="280"
      />
    </div>
  );
}
