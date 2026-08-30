import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyButtonProps {
	textToCopy: string;
}

export default function CopyButton({ textToCopy }: CopyButtonProps) {
	const { messages } = useI18n();
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		if (isCopied) {
			const timer = setTimeout(() => setIsCopied(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [isCopied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(textToCopy);
			setIsCopied(true);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="link"
						size="icon"
						onClick={handleCopy}
						className="h-8 w-8"
					>
						{isCopied ? (
							<Check className="h-4 w-4 " />
						) : (
							<Copy className="h-4 w-4" />
						)}
						<span className="sr-only">{messages.copyToClipboard}</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isCopied ? messages.copied : messages.copyToClipboard}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
