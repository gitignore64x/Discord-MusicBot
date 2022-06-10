import { PropsWithChildren } from "react";
import Navbar from "./navbar";

export default function Content(props: PropsWithChildren){
    return <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
    }}>
        <Navbar/>
        <div style={{
            marginLeft: '10px'
        }}>
            {props.children}
        </div>
    </div>
}