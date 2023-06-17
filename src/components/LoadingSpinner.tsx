import { VscRefresh } from "react-icons/vsc"

type LoadingSpinnerPropsType = {
    big?: boolean
}

export function LoadingSpinner({ big = false }: LoadingSpinnerPropsType) {
    const sizeClasses = big ? "w-16 h-16" : "w-10 h-10";

    return <div className="flex justify-center p-2">
        <VscRefresh className={`animate-spin ${sizeClasses}`} />
    </div>

}