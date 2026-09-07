import logo from "@/app/assets/branding/tenfold-logo-square-rebrand-loader-v3.png?url";

type TenFoldLogoProps = {
  className?: string;
};

export function TenFoldLogo({ className = "h-6" }: TenFoldLogoProps) {
  return <img src={logo} alt="Ten-Fold" className={`${className} w-auto object-contain`} />;
}
