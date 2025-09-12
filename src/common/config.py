"""
Common configuration utilities for the F1 MCP Server.

This module provides shared configuration loading and validation utilities
used across all components to eliminate code duplication.
"""

import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional, Union
from dataclasses import dataclass

from .logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class BaseConfig:
    """Base configuration class with common utilities"""
    
    def get_env_var(self, key: str, default: Any = None, required: bool = False) -> Any:
        """
        Get environment variable with type conversion and validation.
        
        Args:
            key: Environment variable name
            default: Default value if not set
            required: Whether the variable is required
            
        Returns:
            Environment variable value
            
        Raises:
            ValueError: If required variable is not set
        """
        value = os.environ.get(key, default)
        
        if required and value is None:
            raise ValueError(f"Required environment variable {key} is not set")
        
        return value
    
    def get_bool_env(self, key: str, default: bool = False) -> bool:
        """Get boolean environment variable"""
        value = os.environ.get(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def get_int_env(self, key: str, default: int = 0) -> int:
        """Get integer environment variable"""
        try:
            return int(os.environ.get(key, default))
        except (ValueError, TypeError):
            logger.warning(f"Invalid integer value for {key}, using default {default}")
            return default
    
    def get_float_env(self, key: str, default: float = 0.0) -> float:
        """Get float environment variable"""
        try:
            return float(os.environ.get(key, default))
        except (ValueError, TypeError):
            logger.warning(f"Invalid float value for {key}, using default {default}")
            return default


def load_yaml_config(config_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Load configuration from YAML file.
    
    Args:
        config_path: Path to YAML configuration file
        
    Returns:
        Configuration dictionary
        
    Raises:
        FileNotFoundError: If configuration file doesn't exist
        yaml.YAMLError: If YAML parsing fails
    """
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        logger.info(f"Loaded configuration from {config_path}")
        return config or {}
        
    except yaml.YAMLError as e:
        logger.error(f"Failed to parse YAML configuration: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}")
        raise


def save_yaml_config(config: Dict[str, Any], config_path: Union[str, Path]) -> None:
    """
    Save configuration to YAML file.
    
    Args:
        config: Configuration dictionary
        config_path: Path to save configuration file
    """
    config_path = Path(config_path)
    
    # Create directory if it doesn't exist
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.safe_dump(config, f, default_flow_style=False, sort_keys=False)
        
        logger.info(f"Saved configuration to {config_path}")
        
    except Exception as e:
        logger.error(f"Failed to save configuration: {e}")
        raise


def merge_configs(base_config: Dict[str, Any], override_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge configuration dictionaries, with override values taking precedence.
    
    Args:
        base_config: Base configuration dictionary
        override_config: Override configuration dictionary
        
    Returns:
        Merged configuration dictionary
    """
    merged = base_config.copy()
    
    for key, value in override_config.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = merge_configs(merged[key], value)
        else:
            merged[key] = value
    
    return merged


def validate_config(config: Dict[str, Any], required_keys: list, config_name: str = "configuration") -> None:
    """
    Validate that required configuration keys are present.
    
    Args:
        config: Configuration dictionary
        required_keys: List of required keys (supports nested keys with dots)
        config_name: Name of configuration for error messages
        
    Raises:
        ValueError: If required keys are missing
    """
    missing_keys = []
    
    for key in required_keys:
        if '.' in key:
            # Handle nested keys
            keys = key.split('.')
            current = config
            
            try:
                for k in keys:
                    current = current[k]
            except (KeyError, TypeError):
                missing_keys.append(key)
        else:
            # Handle top-level keys
            if key not in config:
                missing_keys.append(key)
    
    if missing_keys:
        raise ValueError(f"Missing required {config_name} keys: {', '.join(missing_keys)}")


def get_config_with_env_overrides(
    config_path: Union[str, Path],
    env_prefix: str = "",
    required_keys: Optional[list] = None
) -> Dict[str, Any]:
    """
    Load configuration from file with environment variable overrides.
    
    Args:
        config_path: Path to configuration file
        env_prefix: Prefix for environment variables (e.g., "F1_MCP_")
        required_keys: List of required configuration keys
        
    Returns:
        Configuration dictionary with environment overrides applied
    """
    # Load base configuration
    config = load_yaml_config(config_path)
    
    # Apply environment variable overrides
    if env_prefix:
        env_overrides = {}
        
        for key, value in os.environ.items():
            if key.startswith(env_prefix):
                # Convert environment variable name to config key
                config_key = key[len(env_prefix):].lower().replace('_', '.')
                
                # Convert value to appropriate type
                if value.lower() in ('true', 'false'):
                    env_overrides[config_key] = value.lower() == 'true'
                elif value.isdigit():
                    env_overrides[config_key] = int(value)
                elif value.replace('.', '').isdigit():
                    env_overrides[config_key] = float(value)
                else:
                    env_overrides[config_key] = value
        
        # Merge overrides
        config = merge_configs(config, env_overrides)
    
    # Validate required keys
    if required_keys:
        validate_config(config, required_keys, f"configuration from {config_path}")
    
    return config
