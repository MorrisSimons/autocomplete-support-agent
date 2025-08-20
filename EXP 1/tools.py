from langchain_openai import OpenAIEmbeddings  
import json
import numpy as np


def calculate_percentage(value: float, total: float) -> float:
    """Returnerar procentandelen av värdet i förhållande till totalen.

    Args:
    value (float): Värdet att beräkna procent för.
    total (float): Det totala värdet.
    
    """
    if total == 0:
        return 0.0
    return (value / total) * 100

def percentage_of_value(percent: float, amount: float) -> float:
    """Returnerar procentandelen av beloppet baserat på procentvärdet.

    Args:
    percent (float): Procentvärdet.
    amount (float): Det totala beloppet.
    """
    return (percent / 100.0) * amount

